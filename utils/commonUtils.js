module.exports.mapdbData = (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

module.exports.getResponseBody = (code, message, extraData = {}) => ({
    isSuccess: code === 200 ? true : false,
    message,
    code,
    ...extraData
})