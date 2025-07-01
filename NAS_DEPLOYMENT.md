# 在NAS上部署Afilmory

本指南将帮助你在NAS的Docker环境中部署Afilmory，并访问NAS本地文件夹中的照片。

## 准备工作

1. 确保你的NAS支持Docker
2. 在NAS上创建一个用于存放照片的文件夹
3. 准备一个用于存放配置文件的文件夹

## 部署步骤

### 1. 创建配置文件

在配置文件夹中创建`builder.config.json`文件，内容如下：

```json
{
  "storage": {
    "provider": "local-fs",
    "basePath": "/photos",
    "prefix": "",
    "excludeRegex": "^\\..*|.*\\.db$"
  }
}
```

### 2. 运行Docker容器

```bash
docker run -d \
  --name afilmory \
  -p 3000:3000 \
  -v /path/to/config:/config \
  -v /path/to/photos:/photos \
  -e CONFIG_PATH=/config/builder.config.json \
  afilmory/afilmory:latest
```

或者使用Docker Compose:

```bash
# 下载docker-compose.yml文件
# 编辑文件中的路径配置
docker-compose up -d
```

### 3. 访问网页

打开浏览器，访问`http://your-nas-ip:3000`即可查看你的照片库。

## 配置说明

- `basePath`: 照片文件夹的路径，对应容器内的`/photos`
- `prefix`: 如果你只想展示某个子文件夹，可以设置此项
- `excludeRegex`: 排除特定文件的正则表达式 