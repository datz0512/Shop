const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const productSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    desc: {
        type: String,
        required: true,
    },
    imgUrl: {
        type: String,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
});

module.exports = mongoose.model("Product", productSchema);

// const ObjectId = require("mongodb").ObjectId;

// const getDb = require("../utilities/database").getDb;

// class Product {
//     constructor(title, price, desc, imgUrl, id, userId) {
//         this.title = title;
//         this.price = price;
//         this.desc = desc;
//         this.imgUrl = imgUrl;
//         this._id = id ? new ObjectId(id) : null;
//         this.userId = userId;
//     }

//     save() {
//         const db = getDb();
//         let dbOp;
//         if (this._id) {
//             dbOp = db
//                 .collection("products")
//                 .updateOne({ _id: this._id }, { $set: this });
//         } else {
//             dbOp = db.collection("products").insertOne(this);
//         }
//         return dbOp
//             .then(result => {
//                 console.log(result);
//             })
//             .catch(err => {
//                 console.log(err);
//             });
//     }

//     static fetchAll() {
//         const db = getDb();
//         return db
//             .collection("products")
//             .find()
//             .toArray()
//             .then(products => {
//                 return products;
//             })
//             .catch(err => {
//                 console.log(err);
//             });
//     }

//     static findById(prodId) {
//         const db = getDb();
//         const objId = new ObjectId(prodId);
//         console.log(prodId);
//         console.log(objId);
//         return db
//             .collection("products")
//             .find({ _id: objId })
//             .next()
//             .then(product => {
//                 return product;
//             })
//             .catch(err => {
//                 console.log(err);
//             });
//     }

//     static deleteById(prodId) {
//         const db = getDb();
//         return db
//             .collection("products")
//             .deleteOne({ _id: new ObjectId(prodId) })
//             .then(result => {
//                 console.log("Deleted");
//             })
//             .catch(err => {
//                 console.log(err);
//             });
//     }
// }

// module.exports = Product;
