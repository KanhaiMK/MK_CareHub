const Groq = require('groq-sdk');
const Child = require('../models/child.model');
const Adoption = require('../models/adoption.model');
const { invalidateChildrenCache, invalidateChildCache } = require('../utils/cache');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_INSTRUCTION = `You are a warm, empathetic assistant for MK_CareHub, an orphan care and adoption platform, embedded in a small chat widget.

IMPORTANT: Keep every reply short - 2 to 3 sentences maximum, unless the user explicitly asks for more detail. This is a compact chat widget, not a full page - long paragraphs are hard to read here. Be conversational and concise, like a text message, not an essay.

Help users understand adoption, search for children available for adoption, adopt a child, or register a child they've found.
Always be gentle and reassuring, especially with users reporting a found child - they may be anxious.
Never make up information about specific children - always use the search_children function to get real data.
When listing search results, keep it brief - just name, age, and one short line per child, not full descriptions.
When a user wants to register a child, confirm the child's details and ask "shall I submit the application?" before calling register_child - never call it on the first mention.
When a user wants to adopt a specific child, confirm the child's name and ask "shall I submit the application?" before calling apply_for_adoption - never call it on the first mention.`;

// Tool 1: Search children - read-only, safe to auto-execute
const searchChildrenTool = {
    type: 'function',
    function: {
        name: 'search_children',
        description:
            'Search for children available for adoption based on filters like age range or gender. Only returns children whose listings are already verified/approved.',
        parameters: {
            type: 'object',
            properties: {
                minAge: { type: 'number', description: 'Minimum age filter' },
                maxAge: { type: 'number', description: 'Maximum age filter' },
                gender: {
                    type: 'string',
                    enum: ['male', 'female', 'other'],
                    description: 'Filter by gender, if the user specifies one',
                },
            },
        },
    },
};

// Tool 2: Register a found child - a WRITE action, needs extra care
const registerChildTool = {
    type: 'function',
    function: {
        name: 'register_child',
        description:
            'Registers a new child that the user found, submitting it for verification. Only call this once you have gathered name (or "Unknown" if not known), approximate age, gender, and where the child was found. Always confirm these details back to the user in plain text BEFORE calling this function.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: "Child's name, or 'Unknown' if not known" },
                age: { type: 'number', description: 'Approximate age in years' },
                gender: { type: 'string', enum: ['male', 'female', 'other'] },
                foundLocation: { type: 'string', description: 'Where the child was found' },
                story: { type: 'string', description: 'Any additional context shared by the user' },
            },
            required: ['name', 'age', 'gender', 'foundLocation'],
        },
    },
};

// Tool 3: Apply for adoption - a WRITE action, needs confirmation first
const applyForAdoptionTool = {
    type: 'function',
    function: {
        name: 'apply_for_adoption',
        description:
            'Submits an adoption application for a specific child, using the childId returned from search_children. ' +
            'Never invent a childId - only use one the user has already seen from a search result. ' +
            'Always confirm the child\'s name back to the user and get explicit confirmation ("yes") BEFORE calling this function, since it locks the child from other applicants.',
        parameters: {
            type: 'object',
            properties: {
                childId: { type: 'string', description: 'The _id of the child, from a previous search_children result' },
            },
            required: ['childId'],
        },
    },
};

const tools = [searchChildrenTool, registerChildTool, applyForAdoptionTool];

// Actual implementation of search_children (runs when AI calls it) - unchanged
const executeSearchChildren = async ({ minAge, maxAge, gender }) => {
    const filter = { verificationStatus: 'approved', adoptionStatus: 'available' };

    if (minAge !== undefined || maxAge !== undefined) {
        filter.age = {};
        if (minAge !== undefined) filter.age.$gte = minAge;
        if (maxAge !== undefined) filter.age.$lte = maxAge;
    }
    if (gender) filter.gender = gender;

    const children = await Child.find(filter).limit(5).select('name age gender photoUrl story');
    return { count: children.length, children };
};

// Actual implementation of register_child (runs when AI calls it) - unchanged
const executeRegisterChild = async (args, userId) => {
    if (!userId) {
        return { error: 'You must be logged in to register a child. Please log in first.' };
    }

    const child = await Child.create({
        name: args.name,
        age: args.age,
        gender: args.gender,
        foundLocation: args.foundLocation,
        story: args.story || '',
        registeredBy: userId,
    });

    return {
        success: true,
        message: `${args.name} has been submitted for verification.`,
        childId: child._id,
    };
};

// Actual implementation of apply_for_adoption (runs when AI calls it) - unchanged
const executeApplyForAdoption = async ({ childId }, userId) => {
    if (!userId) {
        return { error: 'You must be logged in to apply for adoption. Please log in first.' };
    }

    const child = await Child.findById(childId);
    if (!child) {
        return { error: 'Child not found. Please search again to get a valid childId.' };
    }

    if (child.verificationStatus !== 'approved') {
        return { error: 'This child is not available for adoption yet.' };
    }

    if (child.adoptionStatus !== 'available') {
        return { error: 'This child is already adopted or has a pending application.' };
    }

    const adoption = await Adoption.create({
        child: childId,
        adopter: userId,
    });

    child.adoptionStatus = 'pending_adoption';
    await child.save();

    await invalidateChildrenCache();
    await invalidateChildCache(childId);

    return {
        success: true,
        message: `Adoption application for ${child.name} has been submitted and is awaiting verification.`,
        adoptionId: adoption._id,
    };
};

// Keeps the last N messages, without splitting an assistant tool-call
// from the tool response message(s) that must immediately follow it
const trimHistory = (history, keepLast = 10) => {
    if (history.length <= keepLast) {
        return history;
    }

    let sliceStart = history.length - keepLast;

    // If the cut point lands on a 'tool' role message, walk back to the
    // assistant message that issued the call(s) it's responding to
    while (sliceStart > 0 && history[sliceStart].role === 'tool') {
        sliceStart--;
    }

    return history.slice(sliceStart);
};

const chatWithAssistant = async (userMessage, conversationHistory, userId) => {
    const trimmedHistory = trimHistory(conversationHistory, 10);

    const messages = [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        ...trimmedHistory,
        { role: 'user', content: userMessage },
    ];

    let safetyCounter = 0;
    const MAX_FUNCTION_CALLS = 5; // prevents an infinite loop if the model keeps calling functions

    // Keep processing tool calls until the model responds with plain text
    while (true) {
        const completion = await groq.chat.completions.create({
            model: 'openai/gpt-oss-120b',
            messages,
            tools,
            tool_choice: 'auto',
        });

        const responseMessage = completion.choices[0].message;
        messages.push(responseMessage);

        if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
            // Plain text reply - strip the system message before handing history back to the client
            return {
                reply: responseMessage.content,
                updatedHistory: messages.slice(1),
            };
        }

        if (safetyCounter >= MAX_FUNCTION_CALLS) {
            return {
                reply: "Sorry, I'm having trouble completing that request. Could you try rephrasing?",
                updatedHistory: messages.slice(1),
            };
        }
        safetyCounter++;

        // Groq can request multiple tool calls in one turn - every one needs
        // its own matching tool response message before the next API call
        for (const call of responseMessage.tool_calls) {
            const args = JSON.parse(call.function.arguments || '{}');
            let functionResult;

            if (call.function.name === 'search_children') {
                functionResult = await executeSearchChildren(args);
            } else if (call.function.name === 'register_child') {
                functionResult = await executeRegisterChild(args, userId);
            } else if (call.function.name === 'apply_for_adoption') {
                functionResult = await executeApplyForAdoption(args, userId);
            } else {
                functionResult = { error: 'Unknown function requested' };
            }

            messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify(functionResult),
            });
        }
    }
};

module.exports = {
    chatWithAssistant,
    executeSearchChildren,
    executeRegisterChild,
    executeApplyForAdoption,
    groq,
    tools,
};