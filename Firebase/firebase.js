/* eslint-disable no-undef */
const admin = require('firebase-admin');

const { mapdbData } = require('../utils/commonUtils');
const { firebaseConfig } = require('../Utils/config');

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: process.env.DATABASE_URL,
});

module.exports.db = admin.firestore();

module.exports.verifyNumber =async (phoneNumber) => await admin.auth().createSessionCookie(phoneNumber, {
            expiresIn: 60 * 5 * 1000 // 5 minutes
        });


module.exports.getMembersProfiles = async () => {
  try {
    const snapshot = await db.collection('all_Profiles').get();
    const data = mapdbData(snapshot)
    return data;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    throw new Error('Unable to fetch profiles');
  }
};

module.exports.getUsersProfiles = async () => {
  try {
    const snapshot = await db.collection('users').get();
    const data = mapdbData(snapshot);
    return data;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    throw new Error('Unable to fetch profiles');
  }
};

module.exports.getUserByEmail = async (email) => {
  try {
    const db = admin.firestore();
    const user = db.collection('users');
    const snapshot = await user.where('email', '==', email).get();
    if (snapshot.empty) {
      return false
    }
  
    return mapdbData(snapshot);

  } catch (error) {
    console.error('Error fetching profiles:', error);
    throw new Error('Unable to fetch profiles');
  }
};

module.exports.getUserByPhone = async (phoneNumber) => {
  try {
    const db = admin.firestore();
    const user = db.collection('users');
    const snapshot = await user.where('phoneNumber', '==', phoneNumber).get();
    if (snapshot.empty) {
      return false
    }
  
    return mapdbData(snapshot);
    
  } catch (error) {
    console.error('Error fetching profiles:', error);
    throw new Error('Unable to fetch profiles');
  }
};

module.exports.addUserMemberProfile = async (data) => {
  try {
    const batch = db.batch();

    data.forEach((item) => {
      const docRef = db.collection('users').doc(item.id);
      batch.set(docRef, item);
    });

    await batch.commit();
    console.log('Data successfully added to Firestore');
  } catch (error) {
    console.error('Error adding user profile:', error);
    throw new Error('Unable to add user profile');
  }
};
