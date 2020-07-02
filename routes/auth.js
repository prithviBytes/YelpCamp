var express = require("express");
var router = express.Router({mergeParams : true});
var User = require("../models/user");
var passport = require("passport");
var Comment = require("../models/comment");
var Campground = require("../models/campground");
var middleware = require("../middleware");
var crypto =  require("crypto");
var async = require("async");
var nodemailer = require("nodemailer");
require('dotenv').config();

router.get("/register",function(req,res){
	res.render("users/register",{page : "register"});
});

router.get("/adminRegister",function(req,res){
	res.render("users/adminregister",{ page : "register"});
})

router.post("/register",function(req,res){
	var newUser = new User({
		username : req.body.username,
		firstname : req.body.firstname,
		lastname : req.body.lastname,
		email : req.body.email,
		avatar : req.body.avatar,
		phone : req.body.phone
	});
	console.log(process.env.ADMINPW);
	if(req.body.adminPassword == process.env.ADMINPW){
		newUser.isAdmin = true;
	}
	User.register(newUser, req.body.password , function(err,user){
		if(err){
			req.flash("error",err.message);
			return res.redirect("/register");
		}
		passport.authenticate("local")(req , res, function(){
			req.flash("success","Welcome "+user.username+"!");
			res.redirect("/campgrounds");
			console.log(user);
		});
	})
});

router.get("/login",function(req,res){
	res.render("users/login",{page : "login"});
});

router.post("/login",passport.authenticate("local",{
	successRedirect : "/campgrounds",
	failureRedirect : "/login"
}),
	function(req,res){
	
});

router.get("/logout",function(req,res){
	req.logout();
	req.flash("success","Logged You Out");
	res.redirect("/campgrounds");
});

router.get("/user/:id",function(req,res){
	User.findById(req.params.id,function(err,foundUser){
		if(err){
			req.flash("error","Something Went Wrong"+err);
			res.redirect("/campgrounds");
		}else{
			Campground.find().where("author.id").equals(foundUser._id).exec(function(err,campgrounds){
				if(err){
					req.flash("error","No Campgrounds Found");
					res.redirect("back");
				}else{
					var reviews;
					Comment.countDocuments({"author.id" : foundUser._id},function(err,count){
						if(err){
							console.log(err);
						}else{
							reviews = count;
							res.render("users/show",{ user : foundUser, campgrounds : campgrounds,likes : 0,reviews : reviews});
						}
					})		
				}
			})
		}
	});
});

router.get("/user/:id/edit",middleware.checkProfileAuthorization,function(req,res){
	User.findById(req.params.id,function(err,foundUser){
		if(err){
			req.flash("error","Something went wrong!");
			res.redirect("back");
		}else{
			res.render("users/edit",{user:foundUser});
		}
	})
});

router.put("/user/:id",middleware.checkProfileAuthorization,function(req,res){
	User.findByIdAndUpdate(req.params.id,req.body.user,function(err,updatedUser){
		if(err){
			req.flash("Failed to update. Error: "+err);
			res.redirect("back");
		}else{
			req.flash("success","Succesfully Updated!!");
			res.redirect("/user/"+req.params.id);
		}
	});
});

router.get("/forgot",function(req,res){
	res.render("users/forgot");
});

router.post("/forgot",function(req,res,next){
	async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'prithvirajsuvarna56@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'prithvirajsuvarna56@gmail.com',
        subject: 'YelpCamp Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
		res.redirect("/login");
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
	req.flash("error","Something Went Wrong!!")
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('users/reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'prithvirajsuvarna56@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'learntocodeinfo@mail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});


module.exports = router;