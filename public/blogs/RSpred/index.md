
# Tool Deployment: RScore Synthetic Accessibility Predictor

本文档旨在介绍如何部署并使用基于深度学习的合成可行性预测工具 **RSPred (part of RSCore)**。该工具能够基于大规模反应数据库训练的神经网络，对小分子化合物的合成难度进行打分（0-1），有效辅助虚拟筛选中的化合物过滤。

## 1. 环境配置 (Installation)

RSPred 依赖于 **RDKit** 进行分子处理以及 **PyTorch** 进行推理。建议使用 Conda 创建独立的虚拟环境。

### Step 1: 创建虚拟环境

打开终端 (Terminal / Anaconda Prompt)，执行以下命令：

```bash
conda create -n rscore python=3.8
conda activate rscore
conda install -c conda-forge rdkit
pip install torch pandas numpy

```

### Step 2: 获取项目代码

你需要从 GitHub 克隆 RSCore 仓库并定位到预测模型目录。

```bash
# 1. 克隆官方仓库
git clone [https://github.com/ReymondGroup/RSCore.git](https://github.com/ReymondGroup/RSCore.git)

# 2. 进入 RSPred 目录
cd RSCore/synthetic_scorers/RSPred

```

**注意**：请检查当前目录下是否存在 `models/` 文件夹。如果该文件夹为空或不存在，可能需要根据该项目的 README 下载额外的权重文件（通常名为 `chembl_230K_final_87.0.pickle`）。

## 2. 预测脚本 (The Predictor Script)

为了应对实际筛选中常见的格式问题（如盐离子、非标准字符），建议使用以下集成了SMILES清洗的脚本。

新建文件 `run_predictor_v2.py`，并将以下代码完整复制进去：

```python
import pandas as pd
import os
import sys
import torch
from rdkit import Chem
from rdkit.Chem import Descriptors
from rdkit import RDLogger

# 导入同目录下的模型类
try:
    from predictorRS import RSPredictor
except ImportError:
    print("Error: predictorRS.py not found. Please run inside the RSPred directory.")
    sys.exit(1)

# 全局配置：屏蔽 RDKit 的非致命警告
RDLogger.DisableLog('rdApp.*')

def init_model():
    """初始化并加载模型权重"""
    print("Loading RSPred model weights...")
    try:
        model = RSPredictor()
        print("Model loaded successfully.")
        return model
    except Exception as e:
        print(f"Model load failed: {e}")
        sys.exit(1)

def clean_and_predict(smiles_str, model):
    """
    核心处理函数：
    1. 清洗非标准字符
    2. 移除盐和溶剂 (取最长片段)
    3. 计算分子量 (MW)
    4. 执行预测
    """
    if not isinstance(smiles_str, str) or len(smiles_str) < 2:
        return 0.0, 0.0, "Invalid"

    try:
        # A. 字符清洗 ([x], [n] 等占位符)
        clean_smi = (smiles_str.replace('[x]', '').replace('[n]', '')
                     .replace('[=]', '').strip())
        
        # B. 混合物分离 (只取主体药物分子)
        if '.' in clean_smi:
            clean_smi = max(clean_smi.split('.'), key=len)

        # C. 构建 RDKit 分子对象
        mol = Chem.MolFromSmiles(clean_smi)
        if mol is None:
            return 0.0, 0.0, "Parsing Failed"

        # D. 计算属性
        mw = Descriptors.MolWt(mol)
        
        # E. 模型预测 (传入清洗后的 SMILES)
        score = model.predict(Chem.MolToSmiles(mol))
        
        return float(score), float(mw), "Success"
    
    except Exception as e:
        return 0.0, 0.0, f"Error: {str(e)[:15]}"

def main(input_csv):
    # 1. 加载模型
    model = init_model()
    
    # 2. 读取数据
    print(f"Reading file: {input_csv}")
    try:
        df = pd.read_csv(input_csv)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return
    
    # 自动识别 SMILES 列 (假设列名包含 'smi'，不区分大小写)
    smi_col = next((col for col in df.columns if 'smi' in col.lower()), None)
    if not smi_col:
        print("Error: No column containing 'SMILES' found in CSV.")
        return

    print(f"SMILES column detected: {smi_col}, processing {len(df)} molecules...")

    # 3. 批量预测
    results = df[smi_col].apply(lambda x: clean_and_predict(x, model))
    
    # 4. 结果整合
    df[['RSPred_Score', 'MW', 'Status']] = pd.DataFrame(results.tolist(), index=df.index)
    
    # 5. 保存结果
    output_path = input_csv.replace('.csv', '_scored.csv')
    df.to_csv(output_path, index=False)
    
    print("-" * 50)
    print("Processing complete!")
    print("Preview (Top 5):")
    print(df[[smi_col, 'RSPred_Score', 'MW', 'Status']].head().to_string())
    print("-" * 50)
    print(f"Results saved to: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_predictor_v2.py <input.csv>")
    else:
        main(sys.argv[1])

```

## 3. 使用方法 (Usage)

准备一个包含 SMILES 列的 CSV 文件（例如 `compounds.csv`），然后在终端运行：

```bash
python run_predictor_v2.py compounds.csv

```

## 4. 结果解读 (Interpretation)

RSPred 输出的分数范围为 0.0 到 1.0。分数越高，代表模型认为该分子的全合成路线越成熟、合成成功的概率越大。

**High Feasibility (Easy)**

* **Score**: > 0.75
* **特征**: 通常是具有标准骨架的小分子，反应路线成熟。优先考虑。

**Medium Feasibility (Standard)**

* **Score**: 0.40 - 0.75
* **特征**: 大多数现代临床药物（如激酶抑制剂）落在此区间。合成难度可接受。

**Low Feasibility (Hard)**

* **Score**: < 0.30
* **特征**: 通常为大环化合物、拥有多个手性中心的拟肽、或复杂的天然产物衍生物。在早期筛选中建议过滤。
