

**自动化研究：使用 Python 脚本高效批量下载 PDB 结构**

在进行计算机辅助药物设计（CADD）或生物信息学研究时，我们经常需要从 RCSB PDB 数据库批量获取蛋白质结构文件。手动下载不仅耗时，且容易出错。本文提供一个极简且鲁棒的 Python 脚本，支持多 ID 自动下载、自动创建目录以及针对网络不稳定的重试机制。

**1. 准备工作 (Prerequisites)**

确保你的 Python 环境中安装了 `requests` 库，用于处理 HTTP 请求。

```bash
pip install requests

```

**2. 自动化下载脚本 (The Script)**

新建一个名为 `pdb_download.py` 的文件，并将以下代码完整复制进去。

```python
import os, argparse, requests, gzip, shutil
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def setup_session():
    """配置带有自动重试机制的请求会话"""
    session = requests.Session()
    # 当遇到 500, 502, 504 错误时自动重试 3 次
    retry = Retry(total=3, backoff_factor=0.3, status_forcelist=[500, 502, 504])
    session.mount('https://', HTTPAdapter(max_retries=retry))
    return session

def download_pdbs():
    parser = argparse.ArgumentParser(description="Automated PDB Downloader")
    # 支持命令行直接输入多个 ID
    parser.add_argument("ids", nargs='+', help="PDB IDs separated by space")
    # -o 参数指定输出目录
    parser.add_argument("-o", "--output", default=".", help="Output directory path")
    args = parser.parse_args()

    # 自动创建不存在的文件夹
    if not os.path.exists(args.output):
        os.makedirs(args.output)
        print(f"Created directory: {args.output}")

    session = setup_session()
    headers = {'User-Agent': 'Mozilla/5.0'}

    for pdb_id in args.ids:
        # 清洗 ID，确保为大写格式
        pdb_id = pdb_id.strip(',').upper()
        save_path = os.path.join(args.output, f"{pdb_id}.pdb")
        
        # 依次尝试下载原始文件 (.pdb) 和压缩文件 (.pdb.gz)
        urls = [
            f"https://files.rcsb.org/download/{pdb_id}.pdb",
            f"https://files.rcsb.org/download/{pdb_id}.pdb.gz"
        ]

        print(f"Downloading {pdb_id}...", end=" ", flush=True)
        success = False
        
        for url in urls:
            try:
                r = session.get(url, headers=headers, timeout=10)
                if r.status_code == 200:
                    # 如果服务器返回的是压缩包，执行自动解压
                    if url.endswith(".gz"):
                        temp_gz = save_path + ".gz"
                        with open(temp_gz, "wb") as f:
                            f.write(r.content)
                        with gzip.open(temp_gz, 'rb') as f_in:
                            with open(save_path, 'wb') as f_out:
                                shutil.copyfileobj(f_in, f_out)
                        os.remove(temp_gz)
                    else:
                        with open(save_path, "wb") as f:
                            f.write(r.content)
                    print("Done")
                    success = True
                    break
            except Exception:
                continue
        
        if not success:
            print("Failed (All methods)")

if __name__ == "__main__":
    download_pdbs()

```

**3. 使用方法 (Usage)**

在终端（Windows PowerShell 或 Linux Terminal）中切换到脚本所在目录，执行以下命令：

**场景一：下载单个 ID 到指定文件夹**

```bash
python pdb_download.py 1M17 -o ./target_pdbs

```

**场景二：批量下载多个 ID**

```bash
python pdb_download.py 1M17 2A2A 3FLY 1H8D -o ./research_data

```

**4. 核心逻辑说明 (Key Logic)**

* **多格式探测**：脚本会优先尝试下载标准的 `.pdb` 文件，若服务器报错，则尝试下载 `.pdb.gz` 压缩包并自动解压，极大提高了下载成功率。
* **异常处理**：内置了 `requests.Session` 和 `Retry` 机制，能够自动应对因网络抖动导致的连接中断。
* **命令行友好**：通过 `argparse` 实现标准命令行交互，方便后续集成到更大规模的自动化工作流（如全自动 Protein Prep）中。

---
