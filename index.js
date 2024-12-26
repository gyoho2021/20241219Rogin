require('dotenv').config();
require('dotenv').config();
const bcrypt = require('bcrypt');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const User = require('./models/User.js'); // 作成したユーザーモデルをインポート
const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'secretKey',
  resave: false,
  saveUninitialized: true,
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ルート
app.get('/', (req, res) => {
  res.redirect('/login'); // ログインページにリダイレクト
});
// ユーザー登録画面
app.get('/register', (req, res) => {
  const errorMessage = req.query.error; // クエリパラメータからエラーメッセージを取得
  res.render('register', { errorMessage });
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
      const user = new User({ username, password });
      await user.save();
      res.redirect('/login');
  } catch (err) {
      if (err.code === 11000) {
          // ユーザー名の重複エラー
          return res.redirect('/register?error=そのユーザー名は既に使われています。');
      }
      // その他のエラー
      console.error(err);
      res.status(500).send('登録に失敗しました: ' + err.message);
  }
});


app.get('/login',redirectIfLoggedIn, (req, res) => {
  if (req.session.userId) {
      // 既にログインしている場合はダッシュボードへリダイレクト
      return res.redirect('/dashboard');
  }

  // クエリパラメータでエラーメッセージを受け取る
  const errorMessage = req.query.error;

  // ログイン画面を表示
  res.render('login', { errorMessage });
});



app.get('/check-username', async (req, res) => {
  const { username } = req.query; // クエリパラメータからユーザー名を取得
  const user = await User.findOne({ username });
  if (user) {
    return res.status(400).json({ exists: true, message: 'そのユーザー名は既に使われています。' });
  }
  res.json({ exists: false });
});

// ログイン処理
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
      const user = await User.findOne({ username });

      if (!user) {
          return res.status(400).send('ログイン失敗：ユーザー名またはパスワードが正しくありません。');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
          return res.status(400).send('ログイン失敗：ユーザー名またはパスワードが正しくありません。');
      }

      // ユーザーIDとユーザー名をセッションに保存
      req.session.userId = user._id;
      req.session.username = user.username;

      return res.redirect('/dashboard');
  } catch (err) {
      console.error(err);
      return res.status(500).send('サーバーエラーが発生しました。');
  }
});

// ダッシュボード（ログイン必須）
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
      return res.redirect('/login'); // ログインしていない場合はログインページへリダイレクト
  }

  // ユーザー名をテンプレートに渡す
  res.render('dashboard', { username: req.session.username });
});


function redirectIfLoggedIn(req, res, next) {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

app.use(session({
  secret: 'secretKey',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true } // 本番環境では secure: true を有効に
}));


// ログアウト処理
app.get('/logout', (req, res) => {
  // セッションを破棄
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('ログアウト中にエラーが発生しました。');
    }

    // ログインページへリダイレクト
    res.redirect('/login');
  });
});

app.get('/profile', (req, res) => {
  if (!req.session.userId) {
      return res.redirect('/login'); // ログインしていない場合はログインページにリダイレクト
  }

  // プロフィールページを表示
  res.render('profile');
});


// MongoDB接続
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
