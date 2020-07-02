var Campground = require("../models/campground");
var Comment = require("../models/comment");
var Review = require("../models/review");
var User = require("../models/user");
var middlewareObj = {};

middlewareObj.checkCommentOwnership = function(req,res,next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.comment_id,function(err,foundComment){
			if(err){
				res.redirect("back");
			}else{
				if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){
					next();
				}else{
					req.flash("error","You dont have permission to do that");
					res.redirect("back");
				}
			}
		})
	}else{
		req.flash("error","You need to be logged in to do that!!!")
		res.redirect("back");
	}
}

middlewareObj.isLoggedIn = function(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error","You need to be Logged In to do that!!");
	res.redirect("/login");
}

middlewareObj.checkCampgroundOwnership = function(req,res,next){
	if(req.isAuthenticated()){
		Campground.findById(req.params.id,function(err,foundCampground){
			if(err){
				req.flash("error","Campground Not Found!!!");
				res.redirect("back");
			}else{
				if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin){
					next();
				}else{
					req.flash("error","You dont have permission to do that!!!!")
					res.redirect("back");
				}
			}
		})
	}else{
		req.flash("error","You nedd to be Logged In to do that!!!");
		res.redirect("back");
	}
}

middlewareObj.checkProfileAuthorization = function(req,res,next){
	if(req.isAuthenticated()){
	User.findById(req.params.id,function(err,foundUser){
		if(err){
			req.flash("error","Error : "+err);
			res.redirect("back");
		}else{
			if(foundUser._id.equals(req.user._id)){
				next();
			}else{
				req.flash("You are not authorized to do that");
				res.redirect("/campgrounds");
			}
		}
	})	
		}else{
		req.flash("error","You are not authorized to do that!")
		res.redirect("/campgrounds");
	}
}

middlewareObj.checkReviewOwnership = function(req,res,next){
	if(req.isAuthenticated){
		Review.findById(req.params.review_id,function(err,foundReview){
			if(err || !foundReview){
				console.log(err.message);
				req.flash("error",err.message);
				res.redirect("back");
			}else{
				if(foundReview.author.id.equals(req.user._id) || req.user.isAdmin){
					next();
				}else{
					req.flash("You Don't have permission to do that");
					res.redirect("back");
				}
			}
		})
	}else{
		req.flash("error","You need to be logged in to do that!");
		res.redirect("back");
	}
}

middlewareObj.checkReviewExistance = function (req, res, next) {
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id).populate("reviews").exec(function (err, foundCampground) {
            if (err || !foundCampground) {
                req.flash("error", "Campground not found.");
                res.redirect("back");
            } else {
                // check if req.user._id exists in foundCampground.reviews
                var foundUserReview = foundCampground.reviews.some(function (review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review.");
                    return res.redirect("/campgrounds/" + foundCampground._id);
                }
                // if the review was not found, go to the next middleware
                next();
            }
        });
    } else {
        req.flash("error", "You need to login first.");
        res.redirect("back");
    }
};

module.exports = middlewareObj;