"use strict";
const express = require("express");

let todos = [
  { id: 1, title: "ネーム", completed: false },
  { id: 2, title: "下書き", completed: true },
];

const app = express();

// ToDo一覧の取得
app.get("/api/todos", (req, res) => {
  if (!req.query.completed) {
    return res.json(todos);
  }
  // completedクエリパラメータを指定された場合はToDoをフィルタリング
  const completed = req.query.completed === "true";
  res.json(todos.filter((todo) => todo.completed === completed));
});
app.listen(3000);
