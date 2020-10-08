// 本程序用于创建表情包图片列表
const fse = require('fs-extra');
const fs = require('fs');

const path = require('path');

function get_bqb_dir(){

  let file_list = fs.readdirSync(path.join(__dirname, "./"));
  let md_dir_list = [];
  file_list.map((file_name_value, file_name_index)=>{
      if(file_name_value.endsWith("BQB")){
          md_dir_list.push(file_name_value);
      }
  });
  console.log("md_dir_list::", md_dir_list);

  return md_dir_list 
}






function get_json_data(bqb_dir_list, prefix){


  let json_data = [];


  // 遍历表情包文件夹
  for(let i = 0, bqb_dir_list_length = bqb_dir_list.length; i< bqb_dir_list_length;i++){

    let absolute_bqb_path = path.join(__dirname, bqb_dir_list[i]);

    // 获取文件夹内所有表情包图片

    let file_list = fs.readdirSync(absolute_bqb_path);

    // console.log("==>>", file_list);


    for(let n = 0, file_list_length = file_list.length; n < file_list_length; n++){


      let tmp_img_url = prefix + path.join(bqb_dir_list[i] ,file_list[n]);

      console.log(tmp_img_url)


      // 忽略一切隐藏文件

      if(file_list[n].startsWith(".") === false){

        let tmp_img_info = {
          name: file_list[n],
          category: bqb_dir_list[i],
          url: tmp_img_url
        }
  
        json_data.push(tmp_img_info);






      }


    }

  }


  return json_data;




}


function main() {

  // 创建Json文件，ChineseBQB_github.json ChineseBQB_v2fy.json


  // 创建最终写入的数据结构 chinesebqb_github_json  chinesebqb_v2fy_json




  // 获取所有以BQB为后缀的文件夹路径

  let bqb_dir = get_bqb_dir()

  console.log("bqb_dir::", bqb_dir);

  // 将图片地址添加到 chinesebqb_github_json_data  chinesebqb_v2fy_json_data  



  let chinesebqb_github_json_data = get_json_data(bqb_dir, "https://raw.githubusercontent.com/zhaoolee/ChineseBQB/master/");


  let chinesebqb_github_json = {

    status: 1000,
    info: "ChineseBQB的Github数据源",
    data: chinesebqb_github_json_data

  };
  
  let chinesebqb_v2fy_json_data = get_json_data(bqb_dir, "https://v2fy.com/asset/0i/ChineseBQB/")

  let chinesebqb_v2fy_json = {

    status: 1000,
    info: "ChineseBQB的V2方圆数据源",
    data: chinesebqb_v2fy_json_data

  };






  // 创建Json文件，ChineseBQB_github.json ChineseBQB_v2fy.json

  fse.writeJsonSync('./chinesebqb_github.json', chinesebqb_github_json);


  fse.writeJsonSync('./chinesebqb_v2fy.json', chinesebqb_v2fy_json);




  

}


main();