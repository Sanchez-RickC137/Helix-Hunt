// database/db.js
import Dexie from 'dexie';

const db = new Dexie('HelixHuntDB');
db.version(1).stores({
  users: '++id, username, password',
  queryHistory: '++id, userId, query, timestamp'
});

export const addUser = async (username, password) => {
  try {
    const id = await db.users.add({ username, password, genePreferences: [] });
    return id;
  } catch (error) {
    console.error("Error adding user:", error);
    throw error;
  }
};

export const getUser = async (username) => {
  try {
    const user = await db.users.where('username').equals(username).first();
    return user;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

export const addQueryToHistory = async (userId, query) => {
  try {
    const queryToStore = {
      ...query,
      timestamp: new Date().toISOString()
    };
    await db.queryHistory.add({ userId, query: queryToStore });
    return await getQueryHistory(userId);
  } catch (error) {
    console.error("Error adding query to history:", error);
    throw error;
  }
};

export const getQueryHistory = async (userId) => {
  try {
    const history = await db.queryHistory
      .where('userId').equals(userId)
      .reverse()
      .sortBy('timestamp');
    return history.slice(0, 5).map(item => item.query);
  } catch (error) {
    console.error("Error fetching query history:", error);
    throw error;
  }
};

export const updateGenePreferences = async (userId, genePreferences) => {
  try {
    await db.users.update(userId, { genePreferences });
  } catch (error) {
    console.error("Error updating gene preferences:", error);
    throw error;
  }
};

export const getUserById = async (userId) => {
  try {
    const user = await db.users.get(userId);
    return user;
  } catch (error) {
    console.error("Error fetching user by id:", error);
    throw error;
  }
};

export const updateUserPreferences = async (userId, preferences) => {
  try {
    await db.users.update(userId, preferences);
  } catch (error) {
    console.error("Error updating user preferences:", error);
    throw error;
  }
};