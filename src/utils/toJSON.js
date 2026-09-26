// Shared schema option: responses use "id" instead of "_id" and drop "__v"
const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
};

module.exports = toJSON;
