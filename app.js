"use strict";
const express = require("express");

let todos = [
  { id: 1, title: "ネーム", completed: false },
  { id: 2, title: "下書き", completed: true },
];

const app = express();

app.use(express.json());

// ToDo一覧の取得
app.get("/api/todos", (req, res) => {
  if (!req.query.completed) {
    return res.json(todos);
  }
  // completedクエリパラメータを指定された場合はToDoをフィルタリング
  const completed = req.query.completed === "true";
  res.json(todos.filter((todo) => todo.completed === completed));
});

// 全クライアントに対するSSE送信関数を保持する配列
let sseSenders = [];

// SSEのIDを管理するための変数
let sseId = 1;

// ToDo一覧の取得（SSE）
app.get("/api/todos/events", (req, res) => {
  // タイムアウトを抑止
  req.socket.setTimeout(0);
  res.set({
    // Content-TypeでSSEであることを示す
    "Content-Type": "text/event-stream",
  });
  // クライアントにSSEを送信する関数を作成して登録
  const send = (id, data) => res.write(`id: ${id}\ndata: ${data}\n\n`);
  sseSenders.push(send);
  // リクエスト発生時点の状態を送信
  send(sseId, JSON.stringify(todos));
  // リクエストがクローズされたらレスポンスを終了してSSE送信関数を配列から削除
  req.on("close", () => {
    res.end();
    sseSenders = sseSenders.filter((_send) => _send !== send);
  });
});

// ToDoの更新に伴い、全クライアントに対してSSEを送信する
function onUpdateTodos() {
  sseId += 1;
  const data = JSON.stringify(todos);
  sseSenders.forEach((send) => send(sseId, data));
}

// ToDoのIDの値を管理する為の変数
let id = 2;

// ToDoの新規登録
app.post("/api/todos", (req, res, next) => {
  const { title } = req.body;
  if (typeof title !== "string" || !title) {
    // titleがリクエストに含まれない場合はステータスコード400(Bad Request)
    const err = new Error("title is required");
    err.statusCode = 400;
    return next(err);
  }
  // ToDoの作成
  const todo = { id: (id += 1), title, completed: false };
  todos.push(todo);
  // ステータスコード201(Created)で結果を返す
  res.status(201).json(todo);
  onUpdateTodos();
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.statusCode || 500).json({ error: err.message });
});

app.listen(3000);

// Next.jsによるルーティングのためこれ以降を追記
const next = require("next");
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });

nextApp.prepare().then(
  // pagesディレクトリ内の各Reactコンポーネントに対するサーバサイドルーティング
  () => app.get("*", nextApp.getRequestHandler()),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
