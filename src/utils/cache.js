const redis = require('../config/redis');

const CHILDREN_CACHE_KEY = 'children:approved:all';

async function getCachedChildren() {
    return await redis.get(CHILDREN_CACHE_KEY);
}

async function setCachedChildren(data) {
    await redis.set(CHILDREN_CACHE_KEY, data, { ex: 3600 });
}

async function invalidateChildrenCache() {
    await redis.del(CHILDREN_CACHE_KEY);
}

// --- per-child caching ---

function childKey(id) {
    return `children:id:${id}`;
}

async function getCachedChild(id) {
    return await redis.get(childKey(id));
}

async function setCachedChild(id, data) {
    await redis.set(childKey(id), data, { ex: 3600 });
}

async function invalidateChildCache(id) {
    await redis.del(childKey(id));
}

module.exports = {
    getCachedChildren,
    setCachedChildren,
    invalidateChildrenCache,
    getCachedChild,
    setCachedChild, 
    invalidateChildCache,
};