const { mongoose } = require("mongoose");
const Product = require("../models/product");

const { validationResult } = require("express-validator");

exports.getAddProduct = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.redirect("/login");
    }
    res.render("admin/edit-product", {
        path: "/admin/add-product",
        editing: false,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const price = req.body.price;
    const desc = req.body.desc;
    const imgUrl = req.body.imgUrl;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render("admin/edit-product", {
            path: "/admin/add-product",
            editing: false,
            hasError: true,
            product: {
                title: title,
                imgUrl: imgUrl,
                price: price,
                desc: desc,
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array(),
        });
    }

    const product = new Product({
        // _id: new mongoose.Types.ObjectId("654bceca8e1158c2299a4739"),
        title: title,
        price: price,
        desc: desc,
        imgUrl: imgUrl,
        userId: req.user,
    });
    product
        .save()
        .then(result => {
            console.log("Created Product");
            res.redirect("/products");
        })
        .catch(err => {
            res.redirect("/500");
        });
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect("/");
    }
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.redirect("/");
            }
            res.render("admin/edit-product", {
                path: "/admin/edit-product",
                editing: editMode,
                product: product,
                hasError: false,
                errorMessage: null,
                validationErrors: [],
            });
        })
        .catch(err => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const updatedDesc = req.body.desc;
    const updatedImgUrl = req.body.imgUrl;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render("admin/edit-product", {
            path: "/admin/edit-product",
            editing: true,
            hasError: true,
            product: {
                title: updatedTitle,
                imgUrl: updatedImgUrl,
                price: updatedPrice,
                desc: updatedDesc,
                _id: prodId,
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array(),
        });
    }

    Product.findById(prodId)
        .then(product => {
            if (product.userId.toString() !== req.user._id.toString()) {
                return res.redirect("/");
            }
            product.title = updatedTitle;
            product.price = updatedPrice;
            product.desc = updatedDesc;
            product.imgUrl = updatedImgUrl;
            return product.save().then(result => {
                console.log("UPDATED PRODUCT!");
                res.redirect("/admin/products");
            });
        })
        .catch(err => console.log(err));
};

exports.postDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    Product.deleteOne({ _id: prodId, userId: req.user._id })
        .then(result => {
            console.log("Deleted");
            res.redirect("/admin/products");
        })
        .catch(err => console.log(err));
};

exports.getProducts = (req, res, next) => {
    Product.find({ userId: req.user._id })
        // .select("title price -_id")
        // .populate("userId", "name")
        .then(products => {
            res.render("admin/products", {
                prods: products,

                path: "/admin/products",
                isAuthenticated: req.session.isLoggedIn,
            });
        })
        .catch(err => console.log(err));
};
