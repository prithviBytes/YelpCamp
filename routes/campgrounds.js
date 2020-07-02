var express = require("express");
var router = express.Router({mergeParams : true});
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var Review = require("../models/review");
var middleware = require("../middleware");
require('dotenv').config();
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dqfw8jdn4', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


router.get("/",function( req, res){
	res.render("landing");
});

router.get("/campgrounds",function( req, res){
	var perPage = 8;
	var pageQuery = parseInt(req.query.page);
	var pageNumber = pageQuery ? pageQuery : 1;
	if(!req.query.search){
		Campground.find({}).skip((pageNumber*perPage)-perPage).limit(perPage).exec(function(err,allCampgrounds){
			Campground.countDocuments().exec(function(err,count){
				if(err){
					req.flash("error","Something went wrong "+err);
					res.redirect("/campgrounds");
				}else{
					res.render("campgrounds/index",{
						campgrounds:allCampgrounds,
						page : "campgrounds",
						current: pageNumber,
                        pages: Math.ceil(count / perPage)
					});
				}
			})
		});	
	}else{
		const regex = new RegExp(escapeRegex(req.query.search),"gi");
		Campground.find({ name : regex}).skip((perPage*pageNumber)-perPage).limit(perPage).exec(function(err,allCampgrounds){
			Campground.countDocuments().exec(function(err,count){
				if(err){
					console.log("Something went Wrong!!")
				}else{
					if(allCampgrounds.length < 1){
						req.flash("error","No Campground Found");
						res.redirect("/campgrounds");
					}else{
						res.render("campgrounds/index",{
							campgrounds:allCampgrounds,
							page : "campgrounds",
							current: pageNumber,
							pages: Math.ceil(count / perPage)});
					}	
				}
			})
		})
	}
});

router.get("/campgrounds/new",middleware.isLoggedIn,function( req, res){
	res.render("campgrounds/new");
});

router.post("/campgrounds",middleware.isLoggedIn,upload.single('image'),function( req, res){
	if(req.file !== undefined){
		cloudinary.uploader.upload(req.file.path, function(result) {
		  // add cloudinary url for the image to the campground object under image property
		  req.body.campground.image = result.secure_url;
		  // add author to campground
		  req.body.campground.author = {
			id: req.user._id,
			username: req.user.username
		  }
		  Campground.create(req.body.campground, function(err, campground) {
			if (err) {
			  req.flash('error', err.message);
			  return res.redirect('back');
			}
			res.redirect('/campgrounds/' + campground.id);
	  });
	});
	}else{
			req.body.campground.image = req.body.image;
			req.body.campground.author = {
			id: req.user._id,
			username: req.user.username
			}
			Campground.create(req.body.campground,function(err,campground){
				if(err){
					console.log(err);
				}else{
					console.log("Success");
				}
			})
			res.redirect("/campgrounds");
		}
	});

router.get("/campgrounds/:id",function(req, res){
	 Campground.findById(req.params.id).populate("comments likes").populate({
		 path: "reviews",
		 options: {sort:{createdAt:-1}}
	 }).exec(function (err, campground){
		if(err){
			console.log(err);
		}else{
			res.render("campgrounds/show",{campground:campground});
		}
	})
});

router.get("/campgrounds/:id/edit",middleware.checkCampgroundOwnership,function(req,res){
	Campground.findById(req.params.id,function(err,foundCampground){
		res.render("campgrounds/edit",{campground:foundCampground});
	})
});

router.put("/campgrounds/:id",middleware.checkCampgroundOwnership,function(req,res){
	Campground.findByIdAndUpdate(req.params.id,req.body.campground,function(err,updatedCampground){
		if(err){
			res.redirect("/campgrounds");
		}else{
			req.flash("success","Campground Edited!!!")
			res.redirect("/campgrounds/"+req.params.id);
		}
	})
});

router.delete("/campgrounds/:id",middleware.checkCampgroundOwnership,function(req, res){
    Campground.findByIdAndRemove(req.params.id, function(err, campgroundRemoved){
        if (err) {
            console.log(err);
        }
        Comment.deleteMany( {_id: { $in: campgroundRemoved.comments } },function(err){
            if (err) {
                console.log(err);
            }
			Review.deleteMany( {_id: { $in: campgroundRemoved.reviews} },function(err){
				if(err){
					console.log(err);
				}
				req.flash("success","Campground Deleted!!!")
     		    res.redirect("/campgrounds");
			});
        });
    })
});

// Campground Like Route
router.post("/campgrounds/:id/like", middleware.isLoggedIn, function (req, res) {
    Campground.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            req.flash("error","Error"+err);
            return res.redirect("/campgrounds");
        }
        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});

function escapeRegex(text){
	return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}


module.exports = router;