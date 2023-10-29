const fs = require("fs");
const path = require("path");

const fse = require("fs-extra");

let default_title = "中国人的表情包-PP制造计划-ChineseBQB";

// 真实readme的位置
let true_readme_md = "000readme-chinesebqb.md";

// 开始的符号

let start_mark = "---start---";

// 结束的符号

let end_mark = "---end---";

// 排除列表
let exclude_md_files = [];

function get_md_file_list() {
  // 读取当前当前目录下的.md文件
  let root = "./";
  root = __dirname;
  console.log(root);
  let all_files = fs.readdirSync(root);
  let all_md_files = [];

  // 获取md文件列表
  all_files.map((file_name, file_index) => {
    if (file_name.endsWith(".md")) {
      // md文件不包含在排除列表中
      if (exclude_md_files.indexOf(file_name) === -1) {
        all_md_files.push(file_name);
      }
    }
  });
  return all_md_files;
}

// 获取头部信息

function get_top_info(md_file_pathname, key) {
  let content = String(fse.readFileSync(md_file_pathname));
  // console.log("content==>>",content);
  let all_content_line = content.split("\n");
  // console.log("all_content_line::", all_content_line);
  let all_content_line_length = all_content_line.length;

  // 记录分割线行号的数组
  let line_arr = [];

  for (let i = 0; i < all_content_line_length; i++) {
    let line_re = /[-]{3,}/;

    if (line_re.test(all_content_line[i])) {
      // console.log("+acl++>>", i);
      line_arr.push(i);
    }
  }

  // 顶部信息

  for (let i = line_arr[0]; i < line_arr[1]; i++) {
    // 去除行左右两边空格
    let tmp_line_info = all_content_line[i].trim();
    let value = "";
    if (tmp_line_info.indexOf(key) === 0) {
      tmp_line_info = tmp_line_info.replace(key, "");
      tmp_line_info = tmp_line_info.replace(":", "");
      tmp_line_info = tmp_line_info.trim();
      value = tmp_line_info;
      return value;
    }
  }
}

function create_index_info(title_and_filename_list) {
  let index_info = "";

  let title_and_filename_list_length = title_and_filename_list.length;

  for (let m = 0; m < title_and_filename_list_length; m++) {
    let filename_no_md = title_and_filename_list[m]["filename"].replace(
      ".md",
      ""
    );
    let index_info_atom =
      "\n[" +
      title_and_filename_list[m]["title"] +
      "](https://v2fy.com/p/" +
      filename_no_md +
      "/)\n\n";
    index_info = index_info + index_info_atom;
  }

  console.log("index_info==>>", index_info);

  return index_info;
}

async function replace_index_info(index_info) {

    // 获取README中需要被替换的部分
    let readme_content = fse
      .readFileSync(path.join(__dirname, true_readme_md))
      .toString();
    let start_index = readme_content.indexOf(start_mark);
    let end_index = readme_content.indexOf(end_mark);
    let old_content = readme_content.slice(start_index, end_index);

    // 获取生成的数据
    let new_content = index_info;

    // 替换内容
    readme_content = readme_content.replace(
      old_content,
      start_mark + "\n" + new_content
    );

    await fs.writeFileSync(path.join(__dirname, true_readme_md), readme_content);


    return new_content;
}

async function main() {
  let all_md_files = get_md_file_list();
  let all_md_files_length = all_md_files.length;

  let title_and_filename_list = [];

  for (let i = 0; i < all_md_files_length; i++) {
    let title = get_top_info(all_md_files[i], "title");
    if (!title) {
      title = default_title;
    }

    let tmp_title_and_filename = {
      title: title,
      filename: all_md_files[i]
    };

    title_and_filename_list.push(tmp_title_and_filename);
  }

  let index_info = create_index_info(title_and_filename_list);

  // 不替换了

  // await replace_index_info(index_info);
}

main();
