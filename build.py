import os
import re


def auto_less_to_css(file_dir):
    html_path = []
    # 生成文件写入的字符串
    md_content = ""
    # 获取当前目录下所有的图片路径
    all_whole_path_files = []
    for root, dirs, files in os.walk(file_dir):
        if(root.endswith("BQB") == True):
            print("root:::", root)
            print("dirs:::", dirs)
            print("files:::", files)
            print("==="*10)
            # md_content = ""
            md_content = md_content + "\n## "+ root.split("/")[-1] + "\n"
            for file in files:
                try:
                    if ((file[-4:] == ".gif")or(file[-4:] == ".jpg")or(file[-4:] == ".png")):
                        file_info = ["https://raw.githubusercontent.com/zhaoolee/ChineseBQB/master", (root+'/')[1:], file]
                        img_addr = "".join(file_info)
                        print(img_addr)
                        md_content = md_content + "\n---\n" + "!["+img_addr+"]("+img_addr+")\n\n"+"[" + img_addr + "]("+ img_addr +")"+"\n"+"---"+"\n"

                except Exception as e:
                    print(e)

            # 清除上一份文件
            if os.path.isfile(root+"/index.md"):
                os.remove(root+"/index.md")

            # 生成index.md
            with open(root+"/index.md", "ab+") as f:
                f.write(md_content.encode("utf-8"))

            html_path_atom = "https://zhaoolee.github.io/ChineseBQB/"+root.split("/")[-1]
            html_path.append("["+html_path_atom+"]("+html_path_atom+")");

    html_path_str = "\n".join(html_path)

    # 读取readme
    print("生成的链接::", html_path_str)
    readme_content = ""
    with open('./README.md', "r") as f:
        readme_content = f.read()

    print("README内容===>>", readme_content);
    start_index = readme_content.index("表情包目录:")
    end_index = readme_content.index("BQBEND")

    print("开始位置:", start_index, "结束位置:", end_index)

    old_content = readme_content[start_index: end_index+1]
    new_content = "表情包目录" + html_path_str + "BQBEND"

    new_readme_content = readme_content[0: start_index] + new_content +readme_content[end_index:]

    print("new_readme_content::", new_readme_content)
    # 清除上一份README.md
    if os.path.isfile("./README.md"):
        os.remove("./README.md")

    # 生成README.md
    with open("./README.md", "ab+") as f:
        f.write(new_readme_content.encode("utf-8"))

    print("生成成功")



def main():
    auto_less_to_css('.')


if __name__ == '__main__':
    main()
