import os


def auto_less_to_css(file_dir):
    # 获取当前目录下所有的图片路径
    all_whole_path_files = []
    for root, dirs, files in os.walk(file_dir):
        for file in files:
            try:
                if ((file[-4:] == ".gif")or(file[-4:] == ".jpg")or(file[-4:] == ".png")):
                    file_info = ["https://raw.githubusercontent.com/zhaoolee/ChineseBQB/master", (root+'/')[1:], file]
                    all_whole_path_files.append(file_info)
            except Exception as e:
                print(e)


    # 生成文件写入的字符串
    md_content = ""
    for whole_path_file in  all_whole_path_files:
        img_addr = "".join(whole_path_file)
        print(img_addr)
        md_content = md_content + "\n!["+img_addr+"]("+img_addr+")\n\n"+img_addr+"\n"+"---"+"\n"

    # 清除上一份文件
    if os.path.isfile("./index.md"):
        os.remove("./index.md")

    # 生成index.md
    with open("./index.md", "ab+") as f:
        f.write(md_content.encode("utf-8"))


def main():
    auto_less_to_css('.')


if __name__ == '__main__':
    main()
