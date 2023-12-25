// const { mongoose } = require("mongoose");
const { validationResult } = require("express-validator");

const Product = require("../models/product");
const fileHelper = require("../utilities/file");

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
    const image = req.file;
    const price = req.body.price;
    const desc = req.body.desc;
    if (!image) {
        return res.status(422).render("admin/edit-product", {
            path: "/admin/add-product",
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                desc: desc,
            },
            errorMessage: "Attached file is not an image.",
            validationErrors: [],
        });
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render("admin/edit-product", {
            path: "/admin/add-product",
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                desc: desc,
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array(),
        });
    }

    const imgUrl = image.path;

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
            // res.redirect("/500");
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
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
            // throw new Error("dummy");
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
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const updatedDesc = req.body.desc;
    const image = req.file;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render("admin/edit-product", {
            path: "/admin/edit-product",
            editing: true,
            hasError: true,
            product: {
                title: updatedTitle,
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
            if (image) {
                fileHelper.deleteFile(product.imgUrl);
                product.imgUrl = image.path;
            }
            return product.save().then(result => {
                console.log("UPDATED PRODUCT!");
                res.redirect("/admin/products");
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(prod => {
            if (!prod) {
                return next(new Error("Product not found."));
            }
            fileHelper.deleteFile(prod.imgUrl);
            return Product.deleteOne({ _id: prodId, userId: req.user._id });
        })
        .then(result => {
            console.log("Product deleted");
            res.status(200).json({ message: "Success!" });
        })
        .catch(err => {
            res.status(500).json({ message: "Deleting product failed!" });
        });
};

const ITEMS_PER_PAGE = 8;

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find({ userId: req.user._id })
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find({ userId: req.user._id })
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            res.render("admin/products", {
                prods: products,
                path: "/admin/products",
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
