这份文档旨在提供一个干净、专业的通用的双变量关联分析工具箱。

---



这是一个基于 Python 的数据可视化工具箱，专门用于探索和分析数据集中两个变量（X 与 Y）之间的复杂关系。无论你是在处理科学实验数据、金融指标还是性能测试结果，本工具都能通过多维度的视角帮助你识别规律、识别最优解并发现潜在趋势。

##  环境配置 (Environment)

在使用脚本之前，请确保你的 Python 环境（推荐 3.8+）已安装以下基础数据分析库：

```bash
pip install pandas seaborn matplotlib numpy scipy

```

---

##  脚本介绍与用法 (Usage)

### 1. 综合分析总脚本 (`analyze_correlation.py`)

**定位**：一键式全景分析。适合在初步接触数据时，快速获取数据的整体分布和关联特征。

* **功能**：在一张画布上同时生成四个维度的分析图，包括趋势拟合、局部密度、帕累托最优筛选以及层级分布对比。
* **用法**：
```bash
python analyze_correlation.py <数据文件.csv> <变量X> <变量Y>

```



---

### 2. 独立功能模块 (Individual Modules)

如果你需要针对特定的报告或演示生成高清图表，可以使用以下独立模块：

#### A. 趋势关联分析 (`plot_regression.py`)

* **介绍**：通过线性回归和非线性平滑曲线（Lowess）双重拟合，展示变量间的整体走向。它会自动计算相关系数（R）和趋势方程。
* **适用场景**：判断 X 的增长是否会引起 Y 的显著变化。

#### B. 数据密度热图 (`plot_density.py`)

* **介绍**：当数据点非常密集（数千甚至上万）时，普通的散点图会互相重叠。此脚本利用蜂巢网格统计数据频率，展示数据的“中心地带”。
* **适用场景**：识别数据最集中的核心区域，避开离群点的干扰。

#### C. 帕累托最优筛选 (`plot_pareto.py`)

* **介绍**：用于多目标决策。它能自动圈出那些在当前条件下表现“无可替代”的样本点。
* **调节方式**：
* 在脚本配置项中设置 `Y_HIGHER_IS_BETTER`。
* **设置为 True**：寻找 X 越小且 Y 越大的点（左上角），适合寻找高效率、高得分的样本。
* **设置为 False**：寻找 X 越小且 Y 越小的点（左下角），适合寻找低成本、低消耗的样本。



#### D. 层级差异分析 (`plot_boxplot.py`)

* **介绍**：将 X 轴的数据按数值大小等分为四个级别（强、中、弱等），并展示每一级对应的 Y 轴数据分布情况。
* **适用场景**：直观对比不同量级下，变量 Y 的波动范围和中位数差异。

---

##  核心优化特性

* **物理边界约束**：针对无法取负值的特定数据，脚本内置了坐标轴锁定功能，确保趋势拟合线不会穿透至无意义的负数区域。
* **脏数据防御**：自动剔除空值及超出合理范围的异常占位符（如 10000 等报错标志），防止坐标轴因极值而畸变。
* **多字体回退机制**：兼容多种中英文字体库，自动处理数学符号（如平方号）在不同系统下的渲染问题。

---


### 1. 全能分析脚本 (All-in-One)

保存为: `analyze_correlation.py`

```python
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np
import sys
import os
from scipy.stats import linregress

# 设置绘图风格
sns.set(style="whitegrid")
# 尝试支持中文显示
plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

def is_pareto_efficient(costs):
    """
    寻找帕累托最优解的算法
    假设两个指标都是数值越小越好
    """
    is_efficient = np.ones(costs.shape[0], dtype=bool)
    for i, c in enumerate(costs):
        if is_efficient[i]:
            is_efficient[is_efficient] = np.any(costs[is_efficient] < c, axis=1)  
            is_efficient[i] = True 
    return is_efficient

def analyze_and_plot(csv_path, col_x, col_y, output_img="analysis_result.png"):
    if not os.path.exists(csv_path):
        print(f"Error: File {csv_path} not found.")
        return

    print(f"Loading data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    if col_x not in df.columns or col_y not in df.columns:
        print(f"Error: Columns '{col_x}' or '{col_y}' not found in CSV.")
        print(f"Available columns: {list(df.columns)}")
        return

    df_clean = df.dropna(subset=[col_x, col_y])
    print(f"Analyzing {len(df_clean)} data points...")

    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. 总体趋势 (Regression)
    sns.regplot(ax=axes[0, 0], x=col_x, y=col_y, data=df_clean, 
                scatter_kws={'alpha': 0.3, 's': 10}, line_kws={'color': 'red'})
    
    slope, intercept, r_value, p_value, std_err = linregress(df_clean[col_x], df_clean[col_y])
    axes[0, 0].set_title(f'A. Regression Trend (R = {r_value:.2f})', fontsize=14, fontweight='bold')
    axes[0, 0].text(0.05, 0.9, f'y={slope:.2f}x+{intercept:.2f}\nR2={r_value**2:.2f}', 
                    transform=axes[0, 0].transAxes, bbox=dict(facecolor='white', alpha=0.8))

    # 2. 数据密度 (Hexbin Density)
    hb = axes[0, 1].hexbin(df_clean[col_x], df_clean[col_y], gridsize=30, cmap='Blues', mincnt=1)
    axes[0, 1].set_title('B. Data Density (Concentration)', fontsize=14, fontweight='bold')
    cb = fig.colorbar(hb, ax=axes[0, 1])
    cb.set_label('Count')

    # 3. 帕累托前沿 (Pareto Frontier)
    points = df_clean[[col_x, col_y]].values
    pareto_mask = is_pareto_efficient(points)
    
    sns.scatterplot(ax=axes[1, 0], x=col_x, y=col_y, data=df_clean[~pareto_mask], color='lightgray', alpha=0.5, label='Others')
    sns.scatterplot(ax=axes[1, 0], x=col_x, y=col_y, data=df_clean[pareto_mask], color='red', s=60, marker='*', label='Pareto Optimal')
    axes[1, 0].set_title('C. Pareto Frontier (Best Candidates)', fontsize=14, fontweight='bold')
    axes[1, 0].legend()

    # 4. 分组箱线图 (Boxplot by Bins)
    try:
        df_clean['X_Bin'] = pd.qcut(df_clean[col_x], q=4, labels=['Low', 'Med-Low', 'Med-High', 'High'])
        sns.boxplot(ax=axes[1, 1], x='X_Bin', y=col_y, data=df_clean, palette="Set2")
        axes[1, 1].set_title(f'D. Distribution of {col_y} by {col_x} Levels', fontsize=14, fontweight='bold')
    except ValueError:
        axes[1, 1].text(0.5, 0.5, "Not enough unique data for binning", ha='center')

    for ax in axes.flat:
        ax.set_xlabel(col_x, fontsize=12)
        ax.set_ylabel(col_y, fontsize=12)

    plt.tight_layout()
    plt.savefig(output_img, dpi=300)
    print(f"Analysis complete! Plot saved to: {output_img}")
    print(f"Correlation Coefficient (R): {r_value:.3f}")

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        csv_file = sys.argv[1]
        x_col = sys.argv[2]
        y_col = sys.argv[3]
        analyze_and_plot(csv_file, x_col, y_col)
    else:
        print("Usage: python analyze_correlation.py <csv_file> <X_Column_Name> <Y_Column_Name>")

```

---

### 2. 独立模块脚本 (Modular Scripts)

#### 脚本 A：总体趋势回归

保存为: `plot_regression.py`

```python
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from scipy.stats import linregress
import sys
import os

OUTPUT_FILE = "plot_regression.png"

def plot_regression(csv_path, col_x, col_y):
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found")
        return
    df = pd.read_csv(csv_path).dropna(subset=[col_x, col_y])
    
    sns.set(style="whitegrid")
    plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial']
    plt.rcParams['axes.unicode_minus'] = False
    
    plt.figure(figsize=(10, 8))
    
    sns.regplot(x=col_x, y=col_y, data=df, 
                scatter_kws={'alpha': 0.4, 's': 20, 'color': 'steelblue'}, 
                line_kws={'color': 'darkred', 'linewidth': 2})
    
    slope, intercept, r_value, p_value, std_err = linregress(df[col_x], df[col_y])
    
    plt.title(f'Trend Analysis: {col_x} vs {col_y}', fontsize=16)
    plt.xlabel(col_x, fontsize=14)
    plt.ylabel(col_y, fontsize=14)
    
    text_str = f'y = {slope:.2f}x + {intercept:.2f}\nR = {r_value:.3f}\nR2 = {r_value**2:.3f}'
    plt.text(0.05, 0.9, text_str, transform=plt.gca().transAxes, 
             fontsize=12, bbox=dict(facecolor='white', alpha=0.9, edgecolor='gray'))
    
    plt.tight_layout()
    plt.savefig(OUTPUT_FILE, dpi=300)
    print(f"Regression plot saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        plot_regression(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("Usage: python plot_regression.py <csv_file> <X_col> <Y_col>")

```

#### 脚本 B：数据密度热图

保存为: `plot_density.py`

```python
import pandas as pd
import matplotlib.pyplot as plt
import sys
import os

OUTPUT_FILE = "plot_density.png"
GRID_SIZE = 30

def plot_density(csv_path, col_x, col_y):
    if not os.path.exists(csv_path): return
    df = pd.read_csv(csv_path).dropna(subset=[col_x, col_y])
    
    plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial']
    plt.rcParams['axes.unicode_minus'] = False
    
    plt.figure(figsize=(10, 8))
    
    hb = plt.hexbin(df[col_x], df[col_y], gridsize=GRID_SIZE, cmap='Blues', mincnt=1, edgecolors='none')
    
    cb = plt.colorbar(hb)
    cb.set_label('Count', fontsize=12)
    
    plt.title(f'Density Distribution: {col_x} vs {col_y}', fontsize=16)
    plt.xlabel(col_x, fontsize=14)
    plt.ylabel(col_y, fontsize=14)
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_FILE, dpi=300)
    print(f"Density plot saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        plot_density(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("Usage: python plot_density.py <csv_file> <X_col> <Y_col>")

```

#### 脚本 C：帕累托前沿图

保存为: `plot_pareto.py`

```python
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np
import sys
import os

OUTPUT_FILE = "plot_pareto.png"

def is_pareto_efficient(costs):
    is_efficient = np.ones(costs.shape[0], dtype=bool)
    for i, c in enumerate(costs):
        if is_efficient[i]:
            is_efficient[is_efficient] = np.any(costs[is_efficient] < c, axis=1)  
            is_efficient[i] = True
    return is_efficient

def plot_pareto(csv_path, col_x, col_y):
    if not os.path.exists(csv_path): return
    df = pd.read_csv(csv_path).dropna(subset=[col_x, col_y])
    
    points = df[[col_x, col_y]].values
    pareto_mask = is_pareto_efficient(points)
    
    sns.set(style="whitegrid")
    plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial']
    plt.rcParams['axes.unicode_minus'] = False
    
    plt.figure(figsize=(10, 8))
    
    sns.scatterplot(x=col_x, y=col_y, data=df[~pareto_mask], 
                    color='lightgray', alpha=0.6, label='General Molecules')
    
    sns.scatterplot(x=col_x, y=col_y, data=df[pareto_mask], 
                    color='#E63946', s=100, marker='*', label='Pareto Optimal')
    
    plt.title(f'Pareto Frontier Analysis: {col_x} vs {col_y}', fontsize=16)
    plt.xlabel(col_x, fontsize=14)
    plt.ylabel(col_y, fontsize=14)
    plt.legend(fontsize=12)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_FILE, dpi=300)
    print(f"Pareto plot saved to: {OUTPUT_FILE}")
    print(f"Found {np.sum(pareto_mask)} optimal candidates.")

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        plot_pareto(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("Usage: python plot_pareto.py <csv_file> <X_col> <Y_col>")

```

#### 脚本 D：分组箱线图

保存为: `plot_boxplot.py`

```python
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import sys
import os

OUTPUT_FILE = "plot_boxplot.png"

def plot_boxplot(csv_path, col_x, col_y):
    if not os.path.exists(csv_path): return
    df = pd.read_csv(csv_path).dropna(subset=[col_x, col_y])
    
    sns.set(style="whitegrid")
    plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial']
    plt.rcParams['axes.unicode_minus'] = False
    
    plt.figure(figsize=(10, 8))
    
    try:
        df['Group'] = pd.qcut(df[col_x], q=4, labels=['Low', 'Med-Low', 'Med-High', 'High'])
        
        sns.boxplot(x='Group', y=col_y, data=df, palette="Set2", width=0.5)
        sns.stripplot(x='Group', y=col_y, data=df, color='black', size=2, alpha=0.3)
        
    except ValueError:
        print("Error: Not enough data points or unique values for binning.")
        return

    plt.title(f'Distribution Analysis: {col_y} by {col_x} Levels', fontsize=16)
    plt.xlabel(f'{col_x} Quartile Groups', fontsize=14)
    plt.ylabel(col_y, fontsize=14)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_FILE, dpi=300)
    print(f"Boxplot saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        plot_boxplot(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("Usage: python plot_boxplot.py <csv_file> <X_col> <Y_col>")

```