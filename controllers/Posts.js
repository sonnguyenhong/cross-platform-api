const jwt = require('jsonwebtoken');
const UserModel = require('../models/Users');
const PostModel = require('../models/Posts');
const FriendModel = require('../models/Friends');
const DocumentModel = require('../models/Documents');
var url = require('url');
const httpStatus = require('../utils/httpStatus');
const bcrypt = require('bcrypt');
const { JWT_SECRET, LIMIT_POSTS } = require('../constants/constants');
const { ROLE_CUSTOMER } = require('../constants/constants');
const uploadFile = require('../functions/uploadFile');
const mongoose = require('mongoose');

const postsController = {};
postsController.create = async (req, res, next) => {
    let userId = req.userId;
    try {
        const { described, images, videos } = req.body;

        let dataImages = [];
        if (Array.isArray(images)) {
            for (let image of images) {
                image = `data:image/jpg;base64,${image}`;
                if (uploadFile.matchesFileBase64(image) !== false) {
                    const imageResult = uploadFile.uploadFile(image);
                    if (imageResult !== false) {
                        let imageDocument = new DocumentModel({
                            fileName: imageResult.fileName,
                            fileSize: imageResult.fileSize,
                            type: imageResult.type,
                        });
                        let savedImageDocument = await imageDocument.save();
                        if (savedImageDocument !== null) {
                            dataImages.push(savedImageDocument._id);
                        }
                    }
                }
            }
        }

        let dataVideos = [];
        if (Array.isArray(videos)) {
            for (const video of videos) {
                console.log('video 1');
                if (uploadFile.matchesFileBase64(video) !== false) {
                    console.log('video 2');
                    const videoResult = uploadFile.uploadFile(video);
                    if (videoResult !== false) {
                        console.log('video 3');
                        let videoDocument = new DocumentModel({
                            fileName: videoResult.fileName,
                            fileSize: videoResult.fileSize,
                            type: videoResult.type,
                        });
                        let savedVideoDocument = await videoDocument.save();
                        if (savedVideoDocument !== null) {
                            dataVideos.push(savedVideoDocument._id);
                        }
                    }
                }
            }
        }

        const post = new PostModel({
            author: userId,
            described: described,
            images: dataImages,
            videos: dataVideos,
            countComments: 0,
        });

        let postSaved = (await post.save()).populate('images').populate('videos');
        postSaved = await PostModel.findById(postSaved._id)
            .populate('images', ['fileName'])
            .populate('videos', ['fileName'])
            .populate({
                path: 'author',
                select: '_id username phonenumber avatar',
                model: 'Users',
                populate: {
                    path: 'avatar',
                    select: '_id fileName',
                    model: 'Documents',
                },
            });
        return res.status(httpStatus.OK).json({
            data: postSaved,
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: e.message,
        });
    }
};
postsController.edit = async (req, res, next) => {
    try {
        let userId = req.userId;
        let postId = req.params.id;
        let postFind = await PostModel.findById(postId);
        if (postFind == null) {
            return res.status(httpStatus.NOT_FOUND).json({ message: 'Can not find post' });
        }
        if (postFind.author.toString() !== userId) {
            return res.status(httpStatus.FORBIDDEN).json({ message: 'Can not edit this post' });
        }

        const { described, images, videos } = req.body;

        let dataImages = [];
        if (Array.isArray(images)) {
            for (let image of images) {
                // check is old file
                if (image) {
                    // let imageFile = !image.includes('data:') ? await DocumentModel.findById(image) : null;
                    if (image.includes('data:')) {
                        if (uploadFile.matchesFileBase64(image) !== false) {
                            const imageResult = uploadFile.uploadFile(image);
                            if (imageResult !== false) {
                                let imageDocument = new DocumentModel({
                                    fileName: imageResult.fileName,
                                    fileSize: imageResult.fileSize,
                                    type: imageResult.type,
                                });
                                let savedImageDocument = await imageDocument.save();
                                if (savedImageDocument !== null) {
                                    dataImages.push(savedImageDocument._id);
                                }
                            }
                        }
                    } else {
                        const existedImage = await DocumentModel.findOne({
                            fileName: image.split('/').at(-1),
                        });
                        dataImages.push(existedImage._id);
                    }
                }
            }
        }

        let dataVideos = [];
        if (Array.isArray(videos)) {
            for (const video of videos) {
                // check is old file
                if (video) {
                    let videoFile = !video.includes('data:') ? await DocumentModel.findById(video) : null;
                    if (videoFile == null) {
                        if (uploadFile.matchesFileBase64(video) !== false) {
                            const videoResult = uploadFile.uploadFile(video);
                            if (videoResult !== false) {
                                let videoDocument = new DocumentModel({
                                    fileName: videoResult.fileName,
                                    fileSize: videoResult.fileSize,
                                    type: videoResult.type,
                                });
                                let savedVideoDocument = await videoDocument.save();
                                if (savedVideoDocument !== null) {
                                    dataVideos.push(savedVideoDocument._id);
                                }
                            }
                        }
                    }
                }
            }
        }

        let postSaved = await PostModel.findByIdAndUpdate(postId, {
            described: described,
            images: dataImages,
            videos: dataVideos,
        });
        postSaved = await PostModel.findById(postSaved._id)
            .populate('images', ['fileName'])
            .populate('videos', ['fileName'])
            .populate({
                path: 'author',
                select: '_id username phonenumber avatar',
                model: 'Users',
                populate: {
                    path: 'avatar',
                    select: '_id fileName',
                    model: 'Documents',
                },
            });
        return res.status(httpStatus.OK).json({
            data: postSaved,
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: e.message,
        });
    }
};
postsController.show = async (req, res, next) => {
    try {
        let post = await PostModel.findById(req.params.id)
            .populate('images', ['fileName'])
            .populate('videos', ['fileName'])
            .populate({
                path: 'author',
                select: '_id username phonenumber avatar',
                model: 'Users',
                populate: {
                    path: 'avatar',
                    select: '_id fileName',
                    model: 'Documents',
                },
            });
        if (post == null) {
            return res.status(httpStatus.NOT_FOUND).json({ message: 'Can not find post' });
        }
        post.isLike = post.like.includes(req.userId);
        return res.status(httpStatus.OK).json({
            data: post,
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

postsController.delete = async (req, res, next) => {
    try {
        let post = await PostModel.findByIdAndDelete(req.params.id);
        if (post == null) {
            return res.status(httpStatus.NOT_FOUND).json({ message: 'Can not find post' });
        }
        return res.status(httpStatus.OK).json({
            message: 'Delete post done',
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

postsController.list = async (req, res, next) => {
    try {
        const existedPosts = req.body.existedPosts;
        const existedPostIds = existedPosts.map((post) => mongoose.Types.ObjectId(post._id));
        let posts = [];
        let userId = req.userId;
        if (req.query.userId) {
            // get Post of one user
            posts = await PostModel.find({
                author: req.query.userId,
            })
                .where('_id')
                .nin(existedPostIds)
                .limit(LIMIT_POSTS)
                .populate('images', ['fileName'])
                .populate('videos', ['fileName'])
                .populate({
                    path: 'author',
                    select: '_id firstName lastName phonenumber avatar',
                    model: 'Users',
                    populate: {
                        path: 'avatar',
                        select: '_id fileName',
                        model: 'Documents',
                    },
                });
        } else {
            const user = await UserModel.findById(userId);
            const blockedDiaryList = user.blocked_diary ? user.blocked_diary : [];
            // console.log(blockedDiaryList)
            // get list friend of 1 user
            let friends = await FriendModel.find({
                status: '1',
            }).or([
                {
                    sender: userId,
                },
                {
                    receiver: userId,
                },
            ]);
            let listIdFriends = [];
            // console.log(friends)
            for (let i = 0; i < friends.length; i++) {
                if (friends[i].sender.toString() === userId.toString()) {
                    if (!blockedDiaryList.includes(friends[i].receiver)) listIdFriends.push(friends[i].receiver);
                } else {
                    if (!blockedDiaryList.includes(friends[i].sender)) listIdFriends.push(friends[i].sender);
                }
            }
            listIdFriends.push(userId);
            // console.log(listIdFriends);
            // get post of friends of 1 user
            posts = await PostModel.find({
                author: listIdFriends,
            })
                .where('_id')
                .nin(existedPostIds)
                .limit(LIMIT_POSTS)
                .populate('images', ['fileName'])
                .populate('videos', ['fileName'])
                .populate({
                    path: 'author',
                    select: '_id firstName lastName phonenumber avatar',
                    model: 'Users',
                    populate: {
                        path: 'avatar',
                        select: '_id fileName',
                        model: 'Documents',
                    },
                });
        }
        let postWithIsLike = [];
        for (let i = 0; i < posts.length; i++) {
            let postItem = posts[i];
            postItem.isLike = postItem.like.includes(req.userId);
            postWithIsLike.push(postItem);
        }
        postWithIsLike = postWithIsLike.sort((post1, post2) => {
            const updatedAt1 = new Date(post1.updatedAt).getTime();
            const updatedAt2 = new Date(post2.updatedAt).getTime();

            if (updatedAt1 < updatedAt2) {
                return 1;
            } else if (updatedAt1 > updatedAt2) {
                return -1;
            } else {
                return 0;
            }
        });
        return res.status(httpStatus.OK).json({
            data: postWithIsLike,
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

module.exports = postsController;
