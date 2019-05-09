import os
import time


def auto_less_to_css(file_dir):
    html_path = []
    # 生成文件写入的字符串
    md_content = ""
    # 获取当前目录下所有的图片路径
    all_whole_path_files = []
    # 记录总数量
    all_img_num = 0
    for root, dirs, files in os.walk(file_dir):
        if(root.endswith("BQB") == True):
            print("root:::", root)
            print("dirs:::", dirs)
            print("files:::", files)
            print("==="*10)
            # 存储预览图
            preview_pic = ""
            md_content = ""
            # 记录数量
            img_num = 0
            md_content = md_content + "\n## "+ root.split("/")[-1] + "\n"
            for file in sorted(files):
                try:
                    if ((file[-4:] == ".gif")or(file[-4:] == ".jpg")or(file[-4:] == ".png")):


                        file_info = ["https://raw.githubusercontent.com/zhaoolee/ChineseBQB/master", (root+'/')[1:], file]
                        img_addr = "".join(file_info)
                        print(img_addr)
                        md_content = md_content + "\n---\n" + "!["+img_addr+"]("+img_addr+")\n\n"+"[" + img_addr + "]("+ img_addr +")"+"\n"+"---"+"\n"
                        img_num = img_num + 1
                        all_img_num = all_img_num + 1
                        # 第一张图片为预览图
                        if(img_num == 1):
                            preview_pic = img_addr


                except Exception as e:
                    print(e)

            # 清除上一份文件
            if os.path.isfile(root+"/index.md"):
                os.remove(root+"/index.md")

            # 生成index.md
            with open(root+"/index.md", "ab+") as f:
                f.write(md_content.encode("utf-8"))


            html_path_atom = "https://zhaoolee.github.io/ChineseBQB/"+root.split("/")[-1]+"/"
            html_path.append("| <img height='100px' src='"+ preview_pic+"'" +" /> | " + "["+html_path_atom.split("/")[-2]+"(当前收录"+str(img_num)+"张)"+"]("+html_path_atom+") |")

            # 清空记录的变量
            preview_pic = ""
            md_content = ""
            img_num = 0


    # 生成表格
    html_path_str = "| 预览图 | 链接 | \n | :---: | :---: | \n" + "\n".join(html_path)

    readme_content = ""
    with open('./README.md', "r") as f:
        readme_content = f.read()

    start_index = readme_content.index("表情包目录")
    end_index = readme_content.index("BQBEND")


    old_content = readme_content[start_index: end_index+1]
    now_date = str(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
    new_content = "表情包目录(已收录"+str(all_img_num)+"张表情包)\n\n" + html_path_str + "\n\n"

    new_readme_content = readme_content[0: start_index] + new_content +readme_content[end_index:]

    # 清除上一份README.md
    if os.path.isfile("./README.md"):
        os.remove("./README.md")

    # 生成README.md
    with open("./README.md", "ab+") as f:
        now_date = str(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
        new_readme_content = new_readme_content+"\n\n 统计数据生成时间: " + now_date + "\n"
        f.write(new_readme_content.encode("utf-8"))

    print("生成成功")



def main():
    auto_less_to_css('.')


if __name__ == '__main__':
    main()
