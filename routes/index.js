
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: '다빈치 코드 게임' });
};