const winston = require('winston');
const express = require('express');
const HttpError = require('../../libs/errors').HttpError;
const router = express.Router();
const ReplyModel = require('../../models/reply_model');
const ReplyLikeModel = require('../../models/reply_like_model');
const authentication = require('../../middlewares/authentication');
const authenticationUser = require('../../middlewares/authentication_user');
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const {
    requiredNumberInRange,
    requiredNonEmptyString,
    stringRequireLength,
} = require('../../libs/validation');

/**
 * @api {post} /experiences/:id/replies 新增單篇經驗的留言 API
 * @apiGroup Experiences Replies
 * @apiParam {String="0 < length <= 1000 "} content 留言內容
 * @apiSuccess {Object} reply 該留言的物件
 * @apiSuccess {String} reply._id 留言的ID
 * @apiSuccess {String} reply.content 留言的內容
 * @apiSuccess {Number} reply.like_count 留言的讚數
 * @apiSuccess {Number} reply.floor 該留言的樓層數 (整數, index from 0)
 * @apiSuccess {String} reply.created_at 該留言的時間
 */
router.post('/:id/replies', [
    authentication.cachedFacebookAuthenticationMiddleware,
    function(req, res, next) {
        try {
            validationPostFields(req.body);
        } catch (err) {
            next(err);
            return;
        }

        const user = req.user;
        const experience_id = req.params.id;
        // pick fields from post body
        const content = req.body.content;

        const reply_model = new ReplyModel(req.db);
        winston.info("/experiences/:id/replies", {
            id: experience_id,
            ip: req.ip,
            ips: req.ips,
            data: req.body,
        });

        const partial_reply = {
            author_id: user._id,
            content,
        };

        reply_model.createReply(experience_id, partial_reply).then((reply) => {
            // 事實上 reply === partial_reply
            const result = {
                reply,
            };

            res.send(result);
        }).catch((err) => {
            if (err instanceof ObjectNotExistError) {
                next(new HttpError(err.message, 404));
            } else {
                next(new HttpError("Internal Server Error", 500));
            }
        });
    },
]);

const MAX_CONTENT_SIZE = 1000;

function validationPostFields(body) {
    if (!requiredNonEmptyString(body.content)) {
        throw new HttpError("留言內容必填！", 422);
    }
    if (!stringRequireLength(body.content, 1, MAX_CONTENT_SIZE)) {
        throw new HttpError("留言內容請少於 1000 個字元", 422);
    }
}

/**
 * @api {get} /experiences/:id/replies 取得單篇經驗的留言列表 API
 * @apiGroup Experiences Replies
 * @apiParam {String="整數"} [start=0] (從第 start 個留言開始 (start =0為第1筆留言）)
 * @apiParam {String="整數, 0 < N <= 1000"} [limit =20] 回傳最多limit個留言
 * @apiSuccess {Object[]} replies 該留言的物件陣列 (由第1樓排到第N樓。第1樓為該篇經驗分享的時間最早的第一個留言，依此類推
 * @apiSuccess {String} replies._id 留言的ID
 * @apiSuccess {String} replies.content 留言的內容
 * @apiSuccess {Number} replies.like_count 留言的讚數
 * @apiSuccess {Boolean} [replies.liked] 該留言是否已經被該名使用按讚過(使用者登入時才會回傳此欄位)
 * @apiSuccess {String} replies.created_at 該留言的時間
 * @apiSuccess {Number} replies.floor 樓層
 */
router.get('/:id/replies', [
    authenticationUser.cachedAndSetUserMiddleware,
    function(req, res, next) {
        const experience_id = req.params.id;
        let limit = parseInt(req.query.limit) || 20;
        let start = parseInt(req.query.start) || 0;
        let user;

        if (!requiredNumberInRange(limit, 1000, 1)) {
            throw new HttpError("limit 格式錯誤", 422);
        }

        winston.info("Get /experiences/:id/replies", {
            id: experience_id,
            ip: req.ip,
            ips: req.ips,
        });

        if (req.user) {
            user = req.user;
        }

        const reply_model = new ReplyModel(req.db);
        const reply_like_model = new ReplyLikeModel(req.db);
        let result = null;

        reply_model.getRepliesByExperienceId(experience_id, start, limit).then((replies) => {
            result = replies;
            const replies_ids = replies.map(reply => reply._id);
            return reply_like_model.getReplyLikesByRepliesIds(replies_ids);
        }).then((likes) => {
            _createLikesField(result, likes, user);
            res.send(_generateGetRepliesViewModel(result));
        }).catch((err) => {
            if (err instanceof ObjectNotExistError) {
                next(new HttpError(err.message, 404));
            } else {
                next(new HttpError("Internal Server Error", 500));
            }
        });
    },
]);

function _createLikesField(replies, likes, user) {
    if (!user) {
        return;
    }
    replies.forEach((reply) => {
        reply.liked = _isExistUserLiked(reply._id, user, likes);
    });
}

function _isExistUserLiked(reply_id, user, likes) {
    const result = likes.find((like) => {
        if (like.reply_id.equals(reply_id) && like.user_id.equals(user._id)) {
            return like;
        }
    });
    return (result) ? true : false;
}

function _generateGetRepliesViewModel(replies) {
    let result ={
        replies: [],
    };
    replies.forEach((reply) => {
        result.replies.push({
            _id: reply._id,
            content: reply.content,
            like_count: reply.like_count,
            liked: reply.liked,
            created_at: reply.created_at,
            floor: reply.floor,
        });
    });
    return result;
}

module.exports = router;
