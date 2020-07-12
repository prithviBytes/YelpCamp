var express = require("express");
var bodyParser =  require("body-parser");
var app = express();
var mongoose = require("mongoose");
var Campground = require("./models/campground");
var Comment = require("./models/comment");
var seedDB = require("./seed");
var User = require("./models/user")
var passport = require("passport");
var flash = require("connect-flash");
var LocalStrategy = require("passport-local");
var methodOverride = require("method-override");

var campgroundRoutes = require("./routes/campgrounds");
var authRoutes = require("./routes/auth");
var commentRoutes = require("./routes/comments");
var reviewRoutes = require("./routes/reviews");

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));
app.use(flash());

app.use(require("express-session")({
	secret : "I Love Chocolates!",
	resave : false,
	saveUninitialized : false
}));
// mongodb://localhost:27017/yelp_camp
mongoose.connect('mongodb+srv://prithvisuvarna56:Lionelronaldo@1@cluster0.t4mwf.mongodb.net/yelpcamp?retryWrites=true&w=majority',
{useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

app.use(passport.initialize());
app.use(methodOverride("_method"));
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(function(req,res,next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.locals.moment = require('moment');

app.use(campgroundRoutes);
app.use(commentRoutes);
app.use(authRoutes);
app.use(reviewRoutes);


// seedDB();

app.listen(3000,function(){
	console.log("Enjoy camping");
});