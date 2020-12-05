"use strict";
const { promisify } = require("util");
const { join, resolve } = require("path");
const { rejects } = require("assert");
const sqlite3 =
  process.env.NODE_ENV === "production"
    ? require("sqlite3")
    : require("sqlite3").verbose(); // production環境以外は冗長モードを利用

// todo-data-storage/sqlite/sqliteというファイルにデータベースの状態を保存
const db = new sqlite3.Database(join(__dirname, "sqlite"));

// コールバックパターンのメソッドをPromise化
const dbGet = promisify(db.get.bind(db));
const dbRun = function () {
  return new Promise((resolve, reject) =>
    db.run.apply(db, [
      ...arguments,
      function (err) {
        err ? reject(err) : resolve(this);
      },
    ])
  );
};
const dbAll = promisify(db.all.bind(db));

/** CREATE TABLE文の実行 **/
dbRun(`CREATE TABLE IF NOT EXISTS todo (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL
)`).catch((err) => {
  // テーブル作成に失敗した場合はアプリケーションを終了
  console.error(err);
  process.exit(1);
});

/** fetchAll()の実装 **/
// データベースのデータをToDoオブジェクトに変換する
function rowToToDo(row) {
  // SQLiteではBOOLEAN型の値が0, 1で保存される為、NOT演算子を２つ重ねて真偽値に変換する
  return { ...row, completed: !!row.completed };
}

exports.fetchAll = () =>
  dbAll("SELECT * FROM todo").then((rows) => rows.map(rowToToDo));

/** fetchByCompleted()の実装 **/
exports.fetchByCompleted = (completed) =>
  dbAll("SELECT * FROM todo WHERE completed = ?", completed).then((rows) =>
    rows.map(rowToToDo)
  );

/** create()の実装 **/
exports.create = async (todo) => {
  await dbRun(
    "INSERT INTO todo VALUES(?, ?, ?)",
    todo.id,
    todo.title,
    todo.completed
  );
};

/** update()の実装 **/
exports.update = (id, update) => {
  const setColumns = [];
  const values = [];
  for (const column of ["title", "completed"]) {
    if (column in update) {
      setColumns.push(`${column} = ?`);
      values.push(`update[column]`);
    }
  }
  values.push(id);
  return dbRun(
    `UPDATE todo SET ${setColumns.join()} WHERE id = ?`,
    values
  ).then(({ changes }) =>
    changes === 1
      ? dbGet("SELECT * FROM todo WHERE id = ?", id).then(rowToToDo)
      : null
  );
};

/** remove()の実装 **/
exports.remove = (id) =>
  dbRun("DELETE FROM todo WHERE id = ?", id).then(({ changes }) =>
    changes === 1 ? id : null
  );
