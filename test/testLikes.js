
describe('Like related functions', function() {

    describe('POST /replies/:id/likes', function() {
        //TODO: insert fake reply for testing

        it('應該回傳 404 錯誤，如果該則留言不存在');
        it('不應新增 like 文件，如果該則留言不存在');
        it('應該回傳 { success: true }');
        it('應該回傳 200 成功的訊息');
        it('應該新增一個 like 文件，內容為指定的 (user, reply_id)');
        it('應該回傳 403 錯誤，如果已經對該則留言按讚過');
        it('不應新增 like 文件，如果已經對該則留言按讚過');
        it('不應刪除原有 like 文件，如果已經對該則留言按讚過');
    });
});
