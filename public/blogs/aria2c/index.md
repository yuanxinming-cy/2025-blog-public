



本教程介绍 Windows 系统下 Aria2c的部署，并通过配置 PowerShell Profile 实现自动化镜像加速下载，以解决绝大部分场景下的下载加速问题

## 1. 部署 Aria2c 核心程序

### 方法 A：手动安装（推荐）

1. 访问 [Aria2 GitHub Releases](https://github.com/aria2/aria2/releases) 下载 Windows 版本的二进制压缩包。
2. 将压缩包解压至本地固定目录，例如 `D:\Tools\aria2`。
3. 确保该目录下存在 `aria2c.exe` 文件。

### 方法 B：命令行安装

若已安装包管理器，可直接运行：

```powershell
# 使用 Scoop 安装
scoop install aria2

# 使用 Winget 安装
winget install aria2

```

## 2. 配置系统环境变量

为了实现在任意目录下调用 `aria2c` 命令，建议将其路径添加至 Path 变量中：

1. 按下 `Win + R`，输入 `sysdm.cpl` 并回车。
2. 依次进入 **高级** - **环境变量**。
3. 在 **系统变量** 列表中找到并选中 **Path**，点击 **编辑**。
4. 点击 **新建**，粘贴 `aria2c.exe` 所在的文件夹路径（例如 `D:\Tools\aria2`）。
5. 依次点击 **确定** 保存并退出。
6. **验证**：重新打开 PowerShell，输入 `aria2c --version`，若显示版本信息则配置成功。

## 3. 编写并保存 download 加速函数

通过在 PowerShell 配置文件中定义函数，实现 GitHub 与 Hugging Face 的自动镜像重定向：

1. 在 PowerShell 中输入 `code $profile` (或 `notepad $profile`) 打开配置文件。
2. 在文件中粘贴以下代码：

```powershell
function download {
    param([string]$url)
    
    # 自动替换 GitHub 与 Hugging Face 域名为国内镜像站
    $finalUrl = $url -replace "github.com", "kgithub.com" `
                     -replace "huggingface.co", "hf-mirror.com"
    
    if ($finalUrl -ne $url) {
        Write-Host "Redirected to Mirror: $finalUrl" -ForegroundColor Yellow
    }
    
    # 调用 aria2c 执行多线程下载
    # -c: 断点续传
    # -s 16 -x 16: 开启 16 线程与 16 并发连接
    # -k 1M: 最小分片 1M
    # --check-certificate=false: 忽略证书校验
    aria2c -c -s 16 -x 16 -k 1M --check-certificate=false $finalUrl
}

```

3. 保存文件。
4. 在当前终端输入 `. $profile` 使配置立即生效。

## 4. 使用示例

在终端中直接输入函数名及直链下载链接：

```powershell
download "https://github.com/user/repo/archive/main.zip"

```

程序将自动识别域名，切换至镜像站并启动 16 线程加速下载。

---

