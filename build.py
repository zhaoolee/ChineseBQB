import os


def auto_less_to_css(file_dir):
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

            print("生成的md路径:", root+"/index.md")

def main():
    auto_less_to_css('.')


if __name__ == '__main__':
    main()
