var express = require("express");
var router = express.Router({mergeParams: true});
var Campground = require("../models/campground");
var Review = require("../models/review");
var middleware = require("../middleware");

// Reviews Index
router.get("/campgrounds/:id/reviews", function (req, res) {
    Campground.findById(req.params.id).populate({
        path: "reviews",
        options: {sort: {createdAt: -1}} // sorting the populated reviews array to show the latest first
    }).exec(function (err, campground) {
        if (err || !campground) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/index", {campground: campground});
    });
});

//new route
router.get("/campgrounds/:id/reviews/new",middleware.isLoggedIn,middleware.checkReviewExistance,function(req,res){
	Campground.findById(req.params.id,function(err,campground){
		if(err){
			req.flash("error",err.message);
			return res.redirect("back");
		}
		res.render("reviews/new",{campground:campground});
	});
});

//create router
router.post("/campgrounds/:id/reviews",middleware.isLoggedIn,middleware.checkReviewExistance,function(req,res){
	Campground.findById(req.params.id).populate("reviews").exec(function(err,campground){
		if(err){
			req.flash("error",err.message);
			return res.redirect("back");
		}
		Review.create(req.body.review,function(err,review){
			if(err){
				req.flash("error",err.message);
				 return res.redirect("back");
			}
			review.author.id = req.user._id;
			review.author.username = req.user.username;
			review.campground = campground;
			
			review.save();
			campground.reviews.push(review);
			campground.rating = calculateAverage(campground.reviews);
			
			campground.save();
			req.flash("success","Your review has been succesfully added.");
			res.redirect("/campgrounds/"+req.params.id);
		});
	});
});

//review edit route
router.get("/campgrounds/:id/reviews/:review_id/edit",middleware.checkReviewOwnership,function(req,res){
	Review.findById(req.params.review_id,function(err,foundReview){
		if(err){
			req.flash("error",err.message);
			return res.redirect("back");
		}
		res.render("reviews/edit",{ campground_id : req.params.id , review : foundReview });
	});
});

router.put("/campgrounds/:id/reviews/:review_id",middleware.checkReviewOwnership,function(req,res){
	Review.findByIdAndUpdate( req.params.review_id, req.body.review,function(err,updatedReview){
		if(err){
			req.flash("error",err.message);
			return res.redirect("back");
		}
		Campground.findById(req.params.id).populate("reviews").exec(function(err,campground){
			if(err){
				req.flash("error",err.message);
				return res.redirect("back");
			}
			campground.rating = calculateAverage(campground.reviews);
			campground.save();
			req.flash("success","Your review has been updated Successfully");
			res.redirect("/campgrounds/"+req.params.id);
		})
	})
})

//DELETE REVIEW 
router.delete("/campgrounds/:id/reviews/:review_id",middleware.checkReviewOwnership,function(req,res){
	Review.findByIdAndDelete(req.params.review_id,function(err){
		if(err){
			req.flash("error",err.message);
			return res.redirect("back");
		}
		Campground.findByIdAndUpdate(req.params.id,{$pull:{
			reviews: req.params.review_id
		}},{new:true}).populate("reviews").exec(function(err,campground){
			if(err){
				req.flash("error",err.message);
				return res.redirect("back");
			}
			campground.rating = calculateAverage(campground.reviews);
			campground.save();
			req.flash("success","Review Deleted!");
			res.redirect("/campgrounds/"+req.parmas.id);
		})
	})
});


function calculateAverage(reviews){
	if( reviews.length == 0 ){
		return 0;
	}
	var sum = 0;
	reviews.forEach(function(review){
		sum = sum + review.rating;
	});
	var rating = sum/reviews.length;
	return rating;
}

module.exports = router;