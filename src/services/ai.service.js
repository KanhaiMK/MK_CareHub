const { GoogleGenAI } = require('@google/genai');
const Child = require('../models/child.model');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Tool 1: Search children - read-only, safe to auto-execute
const searchChildrenDeclaration = {
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
};

// Tool 2: Register a found child - a WRITE action, needs extra care
const registerChildDeclaration = {
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
};

const tools = [
    {
        functionDeclarations: [searchChildrenDeclaration, registerChildDeclaration],
    },
];

// Actual implementation of search_children (runs when AI calls it)
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

// Actual implementation of register_child (runs when AI calls it)
// Note: requires the logged-in user's ID, passed in separately - the AI never supplies this itself
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

// Keeps the first message (original context) + the last N messages,
// while avoiding splitting a function-call/function-response pair
const trimHistory = (history, keepLast = 10) => {
    if (history.length <= keepLast + 1) {
        return history; // nothing to trim yet
    }

    const first = history[0];
    let sliceStart = history.length - keepLast;

    // If the message at our cut point is a function RESPONSE,
    // we must also keep the function CALL right before it, or the pair breaks
    const candidate = history[sliceStart];
    const isFunctionResponse = candidate.parts?.some((p) => p.functionResponse);
    if (isFunctionResponse) {
        sliceStart -= 1;
    }

    const recentMessages = history.slice(sliceStart);
    return [first, ...recentMessages];
};

const chatWithAssistant = async (userMessage, conversationHistory, userId) => {
    const trimmedHistory = trimHistory(conversationHistory, 10);

    const chat = ai.chats.create({
        model: 'gemini-3.6-flash',
        history: trimmedHistory,
        config: {
        tools,
        systemInstruction: `You are a warm, empathetic assistant for MK_CareHub, an orphan care and adoption platform, embedded in a small chat widget.
        
        IMPORTANT: Keep every reply short - 2 to 3 sentences maximum, unless the user explicitly asks for more detail. This is a compact chat widget, not a full page - long paragraphs are hard to read here. Be conversational and concise, like a text message, not an essay.

        Help users understand adoption, search for children available for adoption, or register a child they've found on the street.
        Always be gentle and reassuring, especially with users reporting a found child - they may be anxious.
        Never make up information about specific children - always use the search_children function to get real data.
        When listing search results, keep it brief - just name, age, and one short line per child, not full descriptions.`,
        },
    });

    const result = await chat.sendMessage({ message: userMessage });

    const functionCalls = result.functionCalls;

    // Case 1: AI just wants to talk - no function needed
    if (!functionCalls || functionCalls.length === 0) {
        return {
        reply: result.text,
        updatedHistory: chat.getHistory(),
        };
    }

    // Case 2: AI wants to call a function
    const call = functionCalls[0];
    let functionResult;

    if (call.name === 'search_children') {
        functionResult = await executeSearchChildren(call.args);
    } else if (call.name === 'register_child') {
        functionResult = await executeRegisterChild(call.args, userId);
    } else {
        functionResult = { error: 'Unknown function requested' };
    }

    // Send the function's result BACK to the AI
    const followUp = await chat.sendMessage({
        message: [
        {
            functionResponse: {
            name: call.name,
            response: functionResult,
            },
        },
        ],
    });

    return {
        reply: followUp.text,
        updatedHistory: chat.getHistory(),
    };
};

module.exports = {
    chatWithAssistant,
    executeSearchChildren,
    executeRegisterChild,
    ai,
    tools
};