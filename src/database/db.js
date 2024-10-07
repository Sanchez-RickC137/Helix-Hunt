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
      fullNames: query.fullNames || [],
      variationIDs: query.variationIDs || [],
      clinicalSignificance: query.clinicalSignificance || [],
      outputFormat: query.outputFormat || '',
      startDate: query.startDate || '',
      endDate: query.endDate || '',
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

export const clearQueryHistory = async (userId) => {
  try {
    await db.queryHistory.where('userId').equals(userId).delete();
    console.log(`Query history cleared for user ${userId}`);
  } catch (error) {
    console.error("Error clearing query history:", error);
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

export const resetPassword = async (username, newPassword) => {
  try {
    const user = await getUser(username);
    if (!user) {
      throw new Error('User not found');
    }
    await db.users.update(user.id, { password: newPassword });
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  }
};

export const updateFullNamePreferences = async (userId, fullNamePreferences) => {
  try {
    await db.users.update(userId, { fullNamePreferences });
    console.log('Full name preferences updated successfully');
  } catch (error) {
    console.error("Error updating full name preferences:", error);
    throw error;
  }
};

export const updateVariationIDPreferences = async (userId, variationIDPreferences) => {
  try {
    await db.users.update(userId, { variationIDPreferences });
    console.log('Variation ID preferences updated successfully');
  } catch (error) {
    console.error("Error updating variation ID preferences:", error);
    throw error;
  }
};

export const getUserPreferences = async (userId) => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      genePreferences: user.genePreferences || [],
      fullNamePreferences: user.fullNamePreferences || [],
      variationIDPreferences: user.variationIDPreferences || []
    };
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    throw error;
  }
};

export const updateUserPassword = async (userId, currentPassword, newPassword) => {
  try {
    const user = await db.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.password !== currentPassword) {
      throw new Error('Current password is incorrect');
    }
    await db.users.update(userId, { password: newPassword });
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
};


