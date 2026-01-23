

Data Visualization: Synthetic Feasibility Distribution (Violin Plot)

本教程介绍如何使用 Python 脚本对分子库的合成可行性分数（如 RSPred Score）进行可视化分析。该脚本通过 **小提琴图 (Violin Plot)** 展示数据的概率密度，并叠加 **散点图 (Strip Plot)** 观察每一个具体样本的分布情况。

---

# 1. 环境配置 (Prerequisites)

在运行脚本前，请确保安装了 Python 3.8+ 以及以下数据科学核心依赖库：

```bash
# 安装数据处理与绘图核心库
pip install pandas seaborn matplotlib

```

# 2. 核心脚本内容 (Script Content)

创建一个名为 `plot_distribution.py` 的文件，并将以下代码完整复制进去：

```python
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import sys

def generate_violin_plot(csv_file, output_file="distribution_result.png"):
    """
    读取CSV数据并生成带有散点叠加的小提琴图
    """
    # 1. 加载数据
    try:
        df = pd.read_csv(csv_file)
    except Exception as e:
        print(f"Error: 无法读取文件 {csv_file}. {e}")
        return

    # 2. 全局风格配置
    sns.set_theme(style="whitegrid") # 设置带网格的背景，方便数值对齐
    plt.figure(figsize=(10, 6), dpi=300) # 设置高分辨率输出

    # 3. 绘制小提琴图 (Violin Plot)
    # inner="quartile"：在小提琴内部显示中位数和四分位数线
    # cut=0：将曲线限制在原始数据范围内，防止出现物理意义之外的延伸
    ax = sns.violinplot(
        data=df, x="Target", y="Score", 
        inner="quartile", cut=0, palette="muted"
    )

    # 4. 叠加原始数据散点 (Strip Plot)
    # jitter=True：增加随机横向抖动，防止数据点重叠
    # alpha=0.4：设置透明度，方便观察点的堆叠密度
    sns.stripplot(
        data=df, x="Target", y="Score", 
        color="black", alpha=0.4, size=4, jitter=True
    )

    # 5. 图表细节修饰
    plt.title("Synthetic Feasibility Analysis", fontsize=16, pad=20)
    plt.ylabel("Score Range (0.0 - 1.0)", fontsize=12)
    plt.xlabel("Category / Target", fontsize=12)
    plt.ylim(0, 1.1) # 略高于 1.0 以便完整展示顶部边缘

    # 6. 保存与输出
    plt.tight_layout()
    plt.savefig(output_file)
    print(f"绘图成功！图片已保存为: {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python plot_distribution.py <your_data.csv>")
    else:
        generate_violin_plot(sys.argv[1])

```

# 3. 数据准备 (Data Format)

脚本要求输入的 `.csv` 文件包含以下两列（严格区分大小写）：

* **Target**: 类别名称（例如数据集名称或靶点名称）。
* **Score**: 具体的数值（范围通常为 0.0 到 1.0）。

**示例数据 (test_data.csv)：**

```csv
Target,Score
Group_A,0.85
Group_A,0.72
Group_B,0.31
Group_B,0.15

```

# 4. 使用方法 (Usage)

在命令行中切换到脚本所在目录，执行以下命令：

```bash
python plot_distribution.py your_data.csv

```

### 5. 图表组件解读 (Interpretation)

生成的图表包含以下核心统计元素：

* **核密度估计 (KDE)**：小提琴外部的轮廓。轮廓越宽，表示该得分区间的数据点分布越密集。
* **中央长虚线**：**中位数 (Median)**。反映该组数据的整体平均水平。
* **上下短虚线**：**四分位数 (Quartiles)**。两条短线之间的区域（四分位距）包含了 50% 的样本，反映了数据的集中程度。
* **散点 (Dots)**：代表每一个真实的样本观察值。通过观察点在小提琴中的位置，可以直观判断是否存在离群值。

---

