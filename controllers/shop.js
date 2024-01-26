const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_API);

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 8;

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            res.render("shop/product-list", {
                prods: products,
                path: "/products",
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

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render("shop/product-detail", {
                product: product,
                path: "/products",
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            res.render("shop/index", {
                prods: products,
                path: "/",
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

exports.getCart = (req, res, next) => {
    req.user
        .populate("cart.items.productId")
        .then(user => {
            const products = user.cart.items;
            res.render("shop/cart", {
                path: "/cart",
                products: products,
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(result => {
            console.log(result);
            res.redirect("/cart");
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then(result => {
            res.redirect("/cart");
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getCheckout = (req, res, next) => {
    let products;
    let total = 0;
    req.user
        .populate("cart.items.productId")
        .then(user => {
            products = user.cart.items;
            total = 0;
            products.forEach(p => {
                total += p.quantity * p.productId.price;
            });
            return stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "payment",
                line_items: products.map(p => {
                    return {
                        price_data: {
                            currency: "usd",
                            product_data: {
                                name: p.productId.title,
                                // description: p.productId.desc,
                            },
                            unit_amount: p.productId.price * 100,
                        },
                        // adjustable_quantity: {
                        //     enabled: true,
                        //     minimum: 1,
                        //     maximum: 10,
                        // },
                        quantity: p.quantity,
                    };
                }),
                success_url:
                    req.protocol +
                    "://" +
                    req.get("host") +
                    "/checkout/success",
                cancel_url:
                    req.protocol + "://" + req.get("host") + "/checkout/cancel",
            });
        })
        .then(session => {
            // console.log(session.url);
            // res.status(303).redirect(session.url);
            res.render("shop/checkout", {
                path: "/checkout",
                products: products,
                totalSum: total.toFixed(2),
                sessionUrl: session.url,
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getCheckoutSuccess = (req, res, next) => {
    req.user
        .populate("cart.items.productId")
        .then(user => {
            const products = user.cart.items.map(i => {
                return {
                    quantity: i.quantity,
                    product: { ...i.productId._doc },
                };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user,
                },
                products: products,
            });
            return order.save();
        })
        .then(result => {
            req.user.clearCart();
        })
        .then(() => {
            res.redirect("/orders");
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postOrder = (req, res, next) => {
    req.user
        .populate("cart.items.productId")
        .then(user => {
            const products = user.cart.items.map(i => {
                return {
                    quantity: i.quantity,
                    product: { ...i.productId._doc },
                };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user,
                },
                products: products,
            });
            return order.save();
        })
        .then(result => {
            req.user.clearCart();
        })
        .then(() => {
            res.redirect("/orders");
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getOrders = (req, res, next) => {
    Order.find({ "user.userId": req.user._id })
        .then(orders => {
            res.render("shop/orders", {
                path: "/orders",
                orders: orders,
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId)
        .then(order => {
            if (!order) {
                next(new Error("No order found."));
            }
            if (order.user.userId.toString() !== req.user._id.toString()) {
                next(new Error("Unauthorized"));
            }
            const invoiceName = "invoice-" + orderId + ".pdf";
            const invoicePath = path.join("data", "invoices", invoiceName);

            const pdfDoc = new PDFDocument({ size: "A4", margin: 65 });
            res.contentType("application/pdf");
            // res.setHeader(
            //     "Content-Disposition",
            //     'inline; filename="' + invoiceName + '"'
            // );
            res.setHeader(
                "Content-Disposition",
                'attachment; filename="' + invoiceName + '"'
            );
            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            pdfDoc.pipe(res);

            //Header
            pdfDoc
                .image("public/images/logo.png", 60, 40, { width: 100 })
                .fillColor("#000")
                .fontSize(10)
                .fillColor("#444444")
                .text("Datz Shop", 200, 50, { align: "right" })
                .text("123 Main Street", 200, 65, { align: "right" })
                .text("New York, NY, 10025", 200, 80, { align: "right" })
                .fillColor("#000")
                .moveDown(4);

            let height = 120;
            pdfDoc
                .font("Helvetica-Bold")
                .fontSize(30)
                .text("Invoice", 70, height, {
                    align: "center",
                });

            //Table
            let tableHeight = height + 70;
            pdfDoc
                .font("Helvetica-Bold")
                .fontSize(12)
                .text("Product Name", 50, tableHeight)
                .text("Price", 280, tableHeight, {
                    width: 90,
                    align: "right",
                })
                .text("Quantity", 370, tableHeight, {
                    width: 90,
                    align: "right",
                })
                .text("Total", 0, tableHeight, { align: "right" });

            pdfDoc
                .strokeColor("#aaaaaa")
                .lineWidth(1)
                .moveTo(50, tableHeight + 25)
                .lineTo(550, tableHeight + 25)
                .stroke();

            let totalPrice = 0;
            let position = 0;
            for (let i = 0; i < order.products.length; i++) {
                totalPrice +=
                    order.products[i].product.price *
                    order.products[i].quantity;
                position = tableHeight + 5 + (i + 1) * 40;
                pdfDoc
                    .font("Helvetica")
                    .fontSize(10)
                    .text(order.products[i].product.title, 50, position)
                    .text(
                        "$" + order.products[i].product.price.toFixed(2),
                        280,
                        position,
                        {
                            width: 90,
                            align: "right",
                        }
                    )
                    .text(order.products[i].quantity, 370, position, {
                        width: 90,
                        align: "right",
                    })
                    .text(
                        "$" +
                            order.products[i].product.price.toFixed(2) *
                                order.products[i].quantity,
                        0,
                        position,
                        {
                            align: "right",
                        }
                    );
                pdfDoc
                    .strokeColor("#aaaaaa")
                    .lineWidth(1)
                    .moveTo(50, position + 20)
                    .lineTo(550, position + 20)
                    .stroke();
            }

            //Total
            pdfDoc
                .font("Helvetica-Bold")
                .fontSize(14)
                .text("", 50, position + 50)
                .text("TOTAL", 280, position + 50, {
                    width: 90,
                    align: "right",
                })
                .text("", 370, position + 50, {
                    width: 90,
                    align: "right",
                })
                .text("$" + totalPrice.toFixed(2), 0, position + 50, {
                    align: "right",
                });

            //Footer
            pdfDoc
                .fontSize(10)
                .text(
                    "Payment is due within 15 days. Thank you for your business.",
                    50,
                    700,
                    { align: "center", width: 500 }
                );

            pdfDoc.end();
        })
        .catch(err => next(err));
};
