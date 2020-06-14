在配置前，请升级NexT至**v6.0.6**以上。

在配置过程中请注意**博客配置文件**和**主题配置文件**的区别。

---

# 注册Leancloud并创建应用
- 首先，前往Leancloud官网[leancloud.cn](leancloud.cn)进行注册，并登陆。
- 然后点击图示`1`处，进入控制台：

  ![1](https://lc-cqha0xyi.cn-n1.lcfile.com/fc0c048a1e25dc3d10aa.jpg)

- 接着，点击图示`1`处，创建应用：

  ![2](https://lc-cqha0xyi.cn-n1.lcfile.com/33a56b754753a5d34b01.jpg)

- 在弹出窗口`1`处输入应用名称（可随意输入，可更改，为演示方便取名为test），并选择`2`处“开发版”，然后点击`3`处创建：

  ![3](https://lc-cqha0xyi.cn-n1.lcfile.com/649ccfc6f12015d1eefb.jpg)

到这里应用创建完成。

# 建立Counter类并在NexT中启用插件
- 点击`1`处应用名称进入应用管理界面：

  ![4](https://lc-cqha0xyi.cn-n1.lcfile.com/d0889df29841661e0b9e.jpg)

- 如图，点击侧边栏`1`处创建Class：

  ![5](https://lc-cqha0xyi.cn-n1.lcfile.com/b0fbc81bd6c19fa09a46.jpg)

- 在弹出窗口`1`处填入`Counter`，勾选`2`处无限制，并点击`3`处创建Class：

  ![6](https://lc-cqha0xyi.cn-n1.lcfile.com/ae6154d6a55f02f11ebf.jpg)

- 此时类已创建完成。接下来点击图示`1`处进入设置，然后点击`2`处进入应用Key：

  ![8](https://lc-cqha0xyi.cn-n1.lcfile.com/9501a6372918dd9a8a92.jpg)

- 粘贴`App ID`和`App Key`到**NexT主题配置文件**`_config.yml`对应位置。此时配置文件应如下：
```yml
leancloud_visitors:
  enable: true
  security: true
  app_id: <<your app id>>
  app_key: <<your app key>>
```

- 设置Web安全域名确保域名调用安全。点击`1`处进入安全中心，然后在`2`处填写自己博客对应的域名（**注意协议、域名和端口号需严格一致**）：

 ![9](https://lc-cqha0xyi.cn-n1.lcfile.com/0e537cc4bec2e185201d.jpg)

到这里内容均与Doublemine的[为NexT主题添加文章阅读量统计功能](https://notes.wanghao.work/2015-10-21-%E4%B8%BANexT%E4%B8%BB%E9%A2%98%E6%B7%BB%E5%8A%A0%E6%96%87%E7%AB%A0%E9%98%85%E8%AF%BB%E9%87%8F%E7%BB%9F%E8%AE%A1%E5%8A%9F%E8%83%BD.html#%E9%85%8D%E7%BD%AELeanCloud)这篇文章相同，只不过截图为新版的Leancloud的界面。

# 部署云引擎以保证访客数量不被随意篡改
- 点击左侧`1`处云引擎，然后点击`2`处部署，再点击`3`处在线编辑：

  ![10](https://lc-cqha0xyi.cn-n1.lcfile.com/d7056dfeeef7c5d66318.jpg)

- 点击`1`处创建函数：

  ![11](https://lc-cqha0xyi.cn-n1.lcfile.com/2737841bbc2bdd572ae0.jpg)

- 在弹出窗口选择`1`处`Hook`类型，然后`2`处选择`beforeUpdate`，`3`处选择刚才建立的`Counter`类。在`4`中粘贴下方代码后，点`5`处保存。
  ```javascript
  var query = new AV.Query("Counter");
  if (request.object.updatedKeys.indexOf('time') !== -1) {
      return query.get(request.object.id).then(function (obj) {
          if (obj.get("time") > request.object.get("time")) {
              throw new AV.Cloud.Error('Invalid update!');
          } 
          return request.object.save();
      });
  }
  ```

  如图所示：

  ![12](https://lc-cqha0xyi.cn-n1.lcfile.com/a8e13418ed1d9405315b.jpg)

- 点击保存后应出现类似红框处函数。此时点击`1`处部署：

  ![13](https://lc-cqha0xyi.cn-n1.lcfile.com/ca56bf2e5fc2a1343565.jpg)

- 在弹出窗口点击`1`处部署：

  ![14](https://lc-cqha0xyi.cn-n1.lcfile.com/17548c13b3b23c71d845.jpg)

- 等待出现红框处的成功部署信息后，点击`1`处关闭：

  ![15](https://lc-cqha0xyi.cn-n1.lcfile.com/d2f50de6cefea9fd0ed3.jpg)


至此云引擎已成功部署，任何非法的访客数量更改请求都将失败。

# 进一步设置权限
- 打开**NexT主题配置文件**`_config.yml`，将leancloud_visitors下的security设置为true（如没有则新增）：
  ```yml
  leancloud_visitors:
    enable: true
    app_id: <<your app id>>
    app_key: <<your app key>>
    # Dependencies: https://github.com/theme-next/hexo-leancloud-counter-security
    security: true
    betterPerformance: false
  ```

  **对`betterPerformance`选项的说明：**
  由于Leancloud免费版的云引擎存在请求线程数和运行时间限制以及休眠机制，很多时候访客数量加载会很慢。如果设置`betterPerformance`为`true`，则网页则会在提交请求之前直接显示访客人数为查询到的人数+1，以增加用户体验。

- 打开cmd并切换至**博客根目录**，键入以下命令以安装`hexo-leancloud-counter-security`插件：
  ```
  npm install hexo-leancloud-counter-security --save
  ```

- 打开**博客配置文件**`_config.yml`，新增以下配置：
  ```yml
  leancloud_counter_security:
    enable_sync: true
    app_id: <<your app id>>
    app_key: <<your app key>
    username:
    password:
  ```

- 在相同目录键入以下命令：
  ```
  hexo lc-counter register <<username>> <<password>>
  ```
  或
  ```
  hexo lc-counter r <<username>> <<password>>
  ```

  将`<<username>>`和`<<password>>`替换为你自己的用户名和密码（不必与leancloud的账号相同）。此用户名和密码将在hexo部署时使用。

  - 打开**博客配置文件**`_config.yml`，将`<<username>>`和`<<password>>`替换为你刚刚设置的用户名和密码：
  ```yml
  leancloud_counter_security:
    enable_sync: true
    app_id: <<your app id>>
    app_key: <<your app key>
    username: <<your username>> #如留空则将在部署时询问
    password: <<your password>> #建议留空以保证安全性，如留空则将在部署时询问
  ```

- 在**博客配置文件**`_config.yml`的`deploy`下添加项：
  ```yml
  deploy:
    # other deployer
    - type: leancloud_counter_security_sync
  ```

- 返回Leancloud控制台的应用内。依次点击`1` `2`，检查_User表中是否出现一条记录（图示以用户名为admin为例）：

  ![16](https://lc-cqha0xyi.cn-n1.lcfile.com/99faa5a0e7160e66d506.jpg)

- 点击`1`处进入Counter表，依次点击`2` `3`，打开权限设置：

  ![17](https://lc-cqha0xyi.cn-n1.lcfile.com/b72a9e64579f5b71749d.jpg)

- <del>点击`1`add_fields后选择`2`指定用户， 并将下两栏留空：</del>此处应与下条create设置相同（选择你所创建的用户）：

  ![18](https://lc-cqha0xyi.cn-n1.lcfile.com/14a8cb37062693d768ad.jpg)

- 点击`1`create后选择`2`指定用户， 在`3`处键入用户名，点击`4`处后点击`5`处添加：

  ![19](https://lc-cqha0xyi.cn-n1.lcfile.com/d91714cfd703ef42b94c.jpg)

  完成此步操作后，界面应与图示类似：

  ![20](https://lc-cqha0xyi.cn-n1.lcfile.com/c05e7ec9218820baf412.jpg)

- 点击`1`delete后选择`2`指定用户， 并将下两栏留空：

 ![21](https://lc-cqha0xyi.cn-n1.lcfile.com/c37b6e20726cfb1d3197.jpg)

至此权限已设置完成，数据库记录只能在本地增删。

每次运行`hexo d`部署的时候，插件都会扫描本地`source/_posts`下的文章并与数据库对比，然后在数据库创建没有录入数据库的文章记录。

如果在**博客配置文件**中留空username或password，则在部署过程中程序会要求输入。

---

原文链接：https://leaferx.online/2018/02/11/lc-security/
