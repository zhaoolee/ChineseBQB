Before you make the config, please upgrade your NexT version to v6.0.6 or greater.

Please note the difference between **site config file** and **theme config file**

---

# Sign up to Leancloud and create an app
- Go to Leancloud website [leancloud.cn](leancloud.cn) and sign up to Leancloud. Then login.
- Click `1` to enter the console:

  ![1](https://lc-cqha0xyi.cn-n1.lcfile.com/fc0c048a1e25dc3d10aa.jpg)

- Then click `1` to create an app:

  ![2](https://lc-cqha0xyi.cn-n1.lcfile.com/33a56b754753a5d34b01.jpg)

- Type your app name in `1` in the pop up window(eg. "test"), then choose `2`, which means developer's plan, and then click `3` to create the app:

  ![3](https://lc-cqha0xyi.cn-n1.lcfile.com/649ccfc6f12015d1eefb.jpg)

# Create Counter class and enable plugin in NexT
- Click `1`(app name) to enter the app manage page:

  ![4](https://lc-cqha0xyi.cn-n1.lcfile.com/d0889df29841661e0b9e.jpg)

- then click `1` to create a class for counter:

  ![5](https://lc-cqha0xyi.cn-n1.lcfile.com/b0fbc81bd6c19fa09a46.jpg)

- Type `Counter` in the pop up window in `1`, check `2`, then click `3`:

  ![6](https://lc-cqha0xyi.cn-n1.lcfile.com/ae6154d6a55f02f11ebf.jpg)

- Click `1` to enter the app setting, then click `2`:

  ![8](https://lc-cqha0xyi.cn-n1.lcfile.com/9501a6372918dd9a8a92.jpg)

- Paste `App ID` and `App Key` to **theme config file**`_config.yml` like this:
  ```yml
  leancloud_visitors:
    enable: true
    app_id: <<your app id>>
    app_key: <<your app key>>
    # Dependencies: https://github.com/theme-next/hexo-leancloud-counter-security
    security: true
    betterPerformance: false
  ```

- Set domain whitelist: Click`1`, then type your domain into `2`(**protocol, domain and port should be exactly the same**):

 ![9](https://lc-cqha0xyi.cn-n1.lcfile.com/0e537cc4bec2e185201d.jpg)

# Deploy web engine to avoid your data being changed illegally
- Click `1 -> 2 -> 3` by order

  ![10](https://lc-cqha0xyi.cn-n1.lcfile.com/d7056dfeeef7c5d66318.jpg)

- Click`1`:

  ![11](https://lc-cqha0xyi.cn-n1.lcfile.com/2737841bbc2bdd572ae0.jpg)

- In the pop up window, click `1` to choose type `Hook`, then choose`beforeUpdate` in `2`, choose `Counter` in `3`. Paste code below into `4`, then click `5` to save it:
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

  ![12](https://lc-cqha0xyi.cn-n1.lcfile.com/a8e13418ed1d9405315b.jpg)

- Click `1` to deploy after the message in the red rect shows up:

  ![13](https://lc-cqha0xyi.cn-n1.lcfile.com/ca56bf2e5fc2a1343565.jpg)

- Click `1` in the pop up：

  ![14](https://lc-cqha0xyi.cn-n1.lcfile.com/17548c13b3b23c71d845.jpg)

- Click `1` to close the pop up window after the message in the red rect shows up:

  ![15](https://lc-cqha0xyi.cn-n1.lcfile.com/d2f50de6cefea9fd0ed3.jpg)

# Set access control for your database
- Open **theme config file**`_config.yml`, set `leancloud_visitors: security` to `true`:
  ```yml
  leancloud_visitors:
    enable: true
    app_id: <<your app id>>
    app_key: <<your app key>>
    # Dependencies: https://github.com/theme-next/hexo-leancloud-counter-security
    security: true
    betterPerformance: false
  ```

  **Explaination for `betterPerformance`:**
  Because the Leancloud developer's plan has limits in requst thread amount and running time, counter number may be very slow to load in some times. If set `betterPerformance` to true, counter number will be displayed quickly by assuming the request is accepted normally.

- Open cmd then switch to **root path of site**, type commands to install `hexo-leancloud-counter-security` plugin:
  ```
  npm install hexo-leancloud-counter-security --save
  ```

- Open **site config file**`_config.yml`, add those config:
  ```yml
  leancloud_counter_security:
    enable_sync: true
    app_id: <<your app id>>
    app_key: <<your app key>
    username:
    password:
  ```

- Type command:
  ```
  hexo lc-counter register <<username>> <<password>>
  ```
  or
  ```
  hexo lc-counter r <<username>> <<password>>
  ```

  Change `<<username>>` and `<<password>>` to your own username and password (no need to be the same as leancloud account). They will be used in the hexo deploying.

  - Open **site config file**`_config.yml`, change `<<username>>` and `<<password>>`to those you set above:
  ```yml
  leancloud_counter_security:
    enable_sync: true
    app_id: <<your app id>>
    app_key: <<your app key>
    username: <<your username>> # will be asked while deploying if be left blank
    password: <<your password>> # recommend to leave it blank for security, will be asked while deploying if be left blank
  ```

- Add the deployer in the `deploy` of **site config file**`_config.yml`:
  ```yml
  deploy:
    - type: git
      repo: // your repo
      ...
    - type: leancloud_counter_security_sync
  ```

- Return to the Leancloud console. Click `1 -> 2`, check if there is a record added in the _User (the img below is using username "admin" for example):

  ![16](https://lc-cqha0xyi.cn-n1.lcfile.com/99faa5a0e7160e66d506.jpg)

- Click `1 -> 2 -> 3` by order:

  ![17](https://lc-cqha0xyi.cn-n1.lcfile.com/b72a9e64579f5b71749d.jpg)

- <del>Click `1`(add_fields), then choose `2`:</del>Do as below "create" setting(choose the user you create):

  ![18](https://lc-cqha0xyi.cn-n1.lcfile.com/14a8cb37062693d768ad.jpg)

- click `1`(create), then choose `2`, type the username in `3`, then click `4 -> 5`:

  ![19](https://lc-cqha0xyi.cn-n1.lcfile.com/d91714cfd703ef42b94c.jpg)

  Now your page should be similar to this img after finishing the step.

  ![20](https://lc-cqha0xyi.cn-n1.lcfile.com/c05e7ec9218820baf412.jpg)

- Click `1`(delete), then choose `2`:

 ![21](https://lc-cqha0xyi.cn-n1.lcfile.com/c37b6e20726cfb1d3197.jpg)

Now the bug is fixed.

---

See detailed version here: https://leaferx.online/2018/03/16/lc-security-en/
