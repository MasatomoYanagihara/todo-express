"use strict";
const { extname } = require("path");
const { readdir, readFile, writeFile, unlink } = require("fs").promises;

/** fetchAll()の実装 **/
exports.fetchAll = async () => {
  // 同一ディレクトリ内に存在するJSONファイルをすべて取得
  const files = (await readdir(__dirname)).filter(
    (file) => extname(file) === ".json"
  );
  return Promise.all(
    files.map((file) =>
      readFile(`${__dirname}/${file}`, "utf8").then(JSON.parse)
    )
  );
};

/** fetchByCompleted()の実装 **/
exports.fetchByCompleted = (completed) =>
  exports
    .fetchAll()
    .then((all) => all.filter((todo) => todo.completed === completed));

/** create()の実装 **/
exports.create = (todo) =>
  writeFile(`${__dirname}/${todo.id}.json`, JSON.stringify(todo));

/** update()の実装 **/
exports.update = async (id, update) => {
  const fileName = `${__dirname}/${id}.json`;
  return readFile(fileName, "utf8").then(
    (content) => {
      const todo = {
        ...JSON.parse(content),
        ...update,
      };
      return writeFile(fileName, JSON.stringify(todo)).then(() => todo);
    },
    // ファイルが存在しない場合はnullを返し、それ以外はそのままエラーにする
    (err) => (err.code === "ENOENT" ? null : Promise.reject(err))
  );
};

/** remove()の実装 **/
exports.remove = (id) =>
  unlink(`${__dirname}/${id}.json`).then(
    () => id,
    // ファイルが存在しない場合はnullを返し、それ以外はそのままエラーにする
    (err) => (err.code === "ENOENT" ? null : Promise.reject(err))
  );
