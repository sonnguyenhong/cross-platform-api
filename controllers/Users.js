const jwt = require('jsonwebtoken');
const UserModel = require('../models/Users');
const DocumentModel = require('../models/Documents');
const PostModel = require('../models/Posts');
const httpStatus = require('../utils/httpStatus');
const bcrypt = require('bcrypt');
const { JWT_SECRET } = require('../constants/constants');
const uploadFile = require('../functions/uploadFile');
const usersController = {};

usersController.register = async (req, res, next) => {
    try {
        console.log(req.body);
        const { firstName, lastName, birthday, gender, phonenumber, password } = req.body;

        let user = await UserModel.findOne({
            phonenumber: phonenumber,
        });

        if (user) {
            console.log(123);
            return res.status(httpStatus.BAD_REQUEST).json({
                message: 'Phone number already exists',
            });
        }
        //Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        let avatar = await DocumentModel.findById('60c39f54f0b2c4268eb53367');
        let coverImage = await DocumentModel.findById('60c39eb8f0b2c4268eb53366');
        user = new UserModel({
            phonenumber: phonenumber,
            password: hashedPassword,
            firstName: firstName,
            lastName: lastName,
            birthday: birthday,
            gender: gender,
            avatar: '60c39f54f0b2c4268eb53367',
            cover_image: '60c39eb8f0b2c4268eb53366',
        });

        try {
            const savedUser = await user.save();

            // login for User
            // create and assign a token
            const token = jwt.sign(
                {
                    username: savedUser.username,
                    firstName: savedUser.firstName,
                    lastName: savedUser.lastName,
                    id: savedUser._id,
                },
                JWT_SECRET,
            );
            res.status(httpStatus.CREATED).json({
                data: {
                    id: savedUser._id,
                    phonenumber: savedUser.phonenumber,
                    username: savedUser.username,
                    avatar: avatar,
                    cover_image: coverImage,
                    firstName: savedUser.firstName,
                    lastName: savedUser.lastName,
                },
                token: token,
            });
        } catch (e) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: e.message,
            });
        }
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: e.message,
        });
    }
};
usersController.login = async (req, res, next) => {
    try {
        const { phonenumber, password } = req.body;
        const user = await UserModel.findOne({
            phonenumber: phonenumber,
        }).populate('avatar');
        if (!user) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: 'Username or password incorrect',
            });
        }

        // password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: 'Username or password incorrect',
            });
        }

        // login success

        // create and assign a token
        const token = jwt.sign(
            { username: user.username, firstName: user.firstName, lastName: user.lastName, id: user._id },
            JWT_SECRET,
        );
        delete user['password'];
        return res.status(httpStatus.OK).json({
            data: {
                id: user._id,
                phonenumber: user.phonenumber,
                username: user.firstName + " " + user.lastName,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                description: user.description,
                address: user.address,
                city: user.city,
                country: user.country,
                cover_image: user.cover_image,
                blocked_inbox: user.blocked_inbox,
                blocked_diary: user.blocked_diary
            },
            token: token,
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: e.message,
        });
    }
};
usersController.edit = async (req, res, next) => {
    try {
        let userId = req.params.id;
        let user;
        let { avatar, cover_image } = req.body;
        avatar = `data:image/jpg;base64,${avatar}`;
        cover_image = `data:image/jpg;base64,${cover_image}`;
        const dataUserUpdate = {};
        const listPros = [
            'username',
            'gender',
            'birthday',
            'description',
            'address',
            'city',
            'country',
            'avatar',
            'cover_image',
        ];
        for (let i = 0; i < listPros.length; i++) {
            let pro = listPros[i];
            if (req.body.hasOwnProperty(pro)) {
                switch (pro) {
                    case 'avatar':
                        let savedAvatarDocument = null;
                        if (uploadFile.matchesFileBase64(avatar) !== false) {
                            const avatarResult = uploadFile.uploadFile(avatar);
                            if (avatarResult !== false) {
                                let avatarDocument = new DocumentModel({
                                    fileName: avatarResult.fileName,
                                    fileSize: avatarResult.fileSize,
                                    type: avatarResult.type,
                                });
                                savedAvatarDocument = await avatarDocument.save();
                            }

                            let avatarPost = null;

                            if (savedAvatarDocument !== null) {
                                avatarPost = new PostModel({
                                    author: userId,
                                    described: 'Thay đổi ảnh đại diện',
                                    images: [savedAvatarDocument._id],
                                    countComments: 0,
                                });
                            } else {
                                avatarPost = new PostModel({
                                    author: userId,
                                    described: 'Thay đổi ảnh đại diện',
                                    images: [],
                                    countComments: 0,
                                });
                            }
                            if (avatarPost) {
                                const avatarPostSaved = (await avatarPost.save()).populate('images');
                            }
                        } else {
                            savedAvatarDocument = await DocumentModel.findById(avatar);
                        }
                        dataUserUpdate[pro] = savedAvatarDocument !== null ? savedAvatarDocument._id : null;
                        break;
                    case 'cover_image':
                        let savedCoverImageDocument = null;
                        if (uploadFile.matchesFileBase64(cover_image) !== false) {
                            const coverImageResult = uploadFile.uploadFile(cover_image);
                            if (coverImageResult !== false) {
                                let coverImageDocument = new DocumentModel({
                                    fileName: coverImageResult.fileName,
                                    fileSize: coverImageResult.fileSize,
                                    type: coverImageResult.type,
                                });
                                savedCoverImageDocument = await coverImageDocument.save();
                            }

                            let coverImagePost = null;
                            if (savedCoverImageDocument !== null) {
                                coverImagePost = new PostModel({
                                    author: userId,
                                    described: 'Thay đổi ảnh bìa',
                                    images: [savedCoverImageDocument._id],
                                    countComments: 0,
                                });
                            } else {
                                coverImagePost = new PostModel({
                                    author: userId,
                                    described: 'Thay đổi ảnh bìa',
                                    images: [],
                                    countComments: 0,
                                });
                            }
                            if (coverImagePost) {
                                const coverImagePostSaved = (await coverImagePost.save()).populate('images');
                            }
                        } else {
                            savedCoverImageDocument = await DocumentModel.findById(cover_image);
                        }
                        dataUserUpdate[pro] = savedCoverImageDocument !== null ? savedCoverImageDocument._id : null;
                        break;
                    default:
                        dataUserUpdate[pro] = req.body[pro];
                        break;
                }
            }
        }

        user = await UserModel.findOneAndUpdate({ _id: userId }, dataUserUpdate, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: 'Can not find user' });
        }
        user = await UserModel.findById(userId)
            .select('phonenumber username gender birthday avatar cover_image blocked_inbox blocked_diary')
            .populate('avatar')
            .populate('cover_image');
        return res.status(httpStatus.OK).json({
            data: user,
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: e.message,
        });
    }
};
usersController.changePassword = async (req, res, next) => {
    try {
        let userId = req.params.id;
        let user = await UserModel.findById(userId);
        if (user == null) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: 'UNAUTHORIZED',
            });
        }
        const { currentPassword, newPassword } = req.body;
        // password
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: 'Current password incorrect',
                code: 'CURRENT_PASSWORD_INCORRECT',
            });
        }

        //Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        user = await UserModel.findOneAndUpdate(
            { _id: userId },
            {
                password: hashedNewPassword,
            },
            {
                new: true,
                runValidators: true,
            },
        );

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: 'Can not find user' });
        }

        // create and assign a token
        const token = jwt.sign(
            { username: user.username, firstName: user.firstName, lastName: user.lastName, id: user._id },
            JWT_SECRET,
        );
        user = await UserModel.findById(userId)
            .select('phonenumber username gender birthday avatar cover_image blocked_inbox blocked_diary')
            .populate('avatar')
            .populate('cover_image');
        return res.status(httpStatus.OK).json({
            data: user,
            token: token,
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: e.message,
        });
    }
};
usersController.show = async (req, res, next) => {
    try {
        let userId = null;
        if (req.params.id) {
            userId = req.params.id;
        } else {
            userId = req.userId;
        }

        let user = await UserModel.findById(userId)
            .select('phonenumber username firstName lastName gender birthday avatar cover_image blocked_inbox blocked_diary description')
            .populate('avatar')
            .populate('cover_image');

        if (user == null) {
            return res.status(httpStatus.NOT_FOUND).json({ message: 'Can not find user' });
        }

        return res.status(httpStatus.OK).json({
            data: user,
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

usersController.showByPhone = async (req, res, next) => {
    try {
        let phonenumber = req.params.phonenumber;

        let user = await UserModel.findOne({ phonenumber: phonenumber }).populate('avatar').populate('cover_image');
        if (user == null) {
            return res.status(httpStatus.NOT_FOUND).json({ message: 'Can not find user' });
        }

        return res.status(httpStatus.OK).json({
            data: user,
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

usersController.setBlock = async (req, res, next) => {
    try {
        console.log(req)
        let targetId = req.body.user_id;
        if (targetId == req.params.id) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: 'Không thể tự chặn bản thân',
            });
        }
        let type = req.body.type;
        let user = await UserModel.findById(req.params.id);
        blocked = [];
        if (user.hasOwnProperty('blocked')) {
            blocked = user.blocked_inbox;
        }

        if (type) {
            if (blocked.indexOf(targetId) === -1) {
                blocked.push(targetId);
            }
        } else {
            const index = blocked.indexOf(targetId);
            if (index > -1) {
                blocked.splice(index, 1);
            }
        }

        user.blocked_inbox = blocked;
        user.save();

        res.status(200).json({
            code: 200,
            message: 'Thao tác thành công',
            data: user,
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: e.message,
        });
    }
};
usersController.setBlockDiary = async (req, res, next) => {
    try {
        let targetId = req.body.user_id;
        if (targetId == req.userId) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: 'Không thể tự chặn bản thân',
            });
        }
        let type = req.body.type;
        let user = await UserModel.findById(req.userId);
        blocked = user.blocked_diary;

        if (type) {
            //chặn 
            if (blocked.indexOf(targetId) === -1) {
                blocked.push(targetId);
            }
        } else {
            // bỏ chặn
            const index = blocked.indexOf(targetId);
            if (index > -1) {
                blocked.splice(index, 1);
            }
        }

        user.blocked_diary = blocked;
        user.save();

        res.status(200).json({
            code: 200,
            message: 'Thao tác thành công',
            data: user,
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: e.message,
        });
    }
};
usersController.searchUser = async (req, res, next) => {
    try {
        let searchKey = new RegExp(req.body.keyword, 'i');
        let result = await UserModel.find({ phonenumber: searchKey })
            .limit(10)
            .populate('avatar')
            .populate('cover_image')
            .exec();

        res.status(200).json({
            code: 200,
            message: 'Tìm kiếm thành công',
            data: result,
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: e.message,
        });
    }
};

module.exports = usersController;
