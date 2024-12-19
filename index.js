require('dotenv').config();
require('dotenv').config();
const bcrypt = require('bcrypt');


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

// ルート
app.get('/', (req, res) => {
  res.send('ログイン機能へようこそ！');
});
// ユーザー登録画面
app.get('/register', redirectIfLoggedIn, (req, res) => {
  res.send(`
    <form method="POST" action="/register">
      <label>Username: <input type="text" name="username" /></label>
      <label>Password: <input type="password" name="password" /></label>
      <button type="submit">Register</button>
    </form>
  `);
});

// ユーザー登録処理
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = new User({ username, password });
    await user.save();
    res.send('ユーザー登録が完了しました！');
  } catch (err) {
    if (err.code === 11000) {
      // 一意性制約違反（ユーザー名の重複）
      return res.status(400).send('登録に失敗しました: そのユーザー名は既に使われています。');
    }
    // その他のエラー
    res.status(500).send('登録に失敗しました: ' + err.message);
  }
});



app.get('/login', redirectIfLoggedIn, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login</title>
        <link rel="stylesheet" href="/css/styles.css">
    </head>
    <body>
        <div class="container">
            <h1>ログイン</h1>
            <form method="POST" action="/login">
                <label for="username">ユーザー名</label>
                <input type="text" id="username" name="username" required>
                <label for="password">パスワード</label>
                <input type="password" id="password" name="password" required>
                <button type="submit">ログイン</button>
            </form>
            <p><a href="/register">新規登録はこちら</a></p>
        </div>
    </body>
    </html>
  `);
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
      // ユーザーが見つからない場合
      return res.status(400).send('ログイン失敗：ユーザー名またはパスワードが正しくありません。');
    }

    // パスワードの比較
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // パスワードが一致しない場合
      return res.status(400).send('ログイン失敗：ユーザー名またはパスワードが正しくありません。');
    }

    // ログイン成功
    req.session.userId = user._id;
    return res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    return res.status(500).send('サーバーエラーが発生しました。');
  }
});

// ダッシュボード（ログイン必須）
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    // ログインしていない場合はログインページへリダイレクト
    return res.redirect('/login');
  }

  // ダッシュボードページを表示
  res.send(`
    <h1>ダッシュボード</h1>
    <p>ようこそ！ログインしています。</p>
    <a href="/logout">ログアウト</a>
  `);
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

// MongoDB接続
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
