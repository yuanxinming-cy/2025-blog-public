机器学习项目阶段性绘图脚本留存(画箱型图分析差异)

```python
import pandas as pd
import numpy as np
import joblib
import argparse
import sys
import matplotlib.pyplot as plt
import seaborn as sns
from rdkit import Chem
from rdkit.Chem import Descriptors, AllChem

# Configure Plotting Style for Publication
sns.set(style="whitegrid", context="paper", font_scale=1.2)
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['axes.unicode_minus'] = False

def parse_arguments():
    """
    Parses command line arguments.
    """
    parser = argparse.ArgumentParser(
        description="Physicochemical Property Analysis: True Positives vs. False Positives",
        epilog="Example: python analyze_fp_distribution.py -c test_set.csv -m fda_scorer.pkl -o result.png"
    )
    
    parser.add_argument('-c', '--csv', required=True, type=str,
                        help="Path to the input CSV dataset (must contain SMILES, Score, Activity_nM, Label).")
    parser.add_argument('-m', '--model', required=True, type=str,
                        help="Path to the trained model file (.pkl).")
    parser.add_argument('-o', '--output', default="property_distribution_analysis.png", type=str,
                        help="Path to save the output plot (default: property_distribution_analysis.png).")
    parser.add_argument('-t', '--threshold', default=0.5, type=float,
                        help="Probability threshold to define 'High Confidence' False Positives (default: 0.5).")
    
    return parser.parse_args()

def calculate_physicochem_properties(mol):
    """
    Calculates key descriptors for Lipinski's Rule of 5 and other structural properties.
    """
    return {
        'MW': Descriptors.MolWt(mol),
        'LogP': Descriptors.MolLogP(mol),
        'TPSA': Descriptors.TPSA(mol),
        'H-Donors': Descriptors.NumHDonors(mol),
        'H-Acceptors': Descriptors.NumHAcceptors(mol),
        'Rotatable Bonds': Descriptors.NumRotatableBonds(mol)
    }

def extract_features_and_predict(model, df):
    """
    Extracts features consistent with the training pipeline and performs inference.
    """
    print(f"[-] Processing {len(df)} samples for feature extraction...")
    
    gen = AllChem.GetMorganGenerator(radius=2, fpSize=2048)
    analyzed_data = []
    
    for idx, row in df.iterrows():
        try:
            # SMILES Standardization
            smi = str(row['SMILES']).split('|')[0].strip()
            mol = Chem.MolFromSmiles(smi)
            if not mol: continue
            
            # 1. Feature Vector Construction (Must match training logic)
            # Part A: Morgan Fingerprint
            fp_arr = gen.GetFingerprintAsNumPy(mol)
            
            # Part B: Scalar Features
            retro_score = float(row['Score'])
            act_val = float(row['Activity_nM'])
            # Log10 transformation for activity
            log_act = np.log10(act_val) if act_val > 0 else -9.0
            
            # Combine Features: [FP(2048) + Score(1) + LogAct(1)]
            X_feat = np.hstack([fp_arr, [retro_score, log_act]]).reshape(1, -1)
            
            # 2. Model Inference
            prob = model.predict_proba(X_feat)[0, 1]
            
            # 3. Property Calculation
            props = calculate_physicochem_properties(mol)
            
            # Store results
            entry = {
                'SMILES': smi, 
                'True_Label': int(row['Label']), 
                'Pred_Prob': prob
            }
            entry.update(props)
            analyzed_data.append(entry)
            
        except Exception as e:
            continue
            
    return pd.DataFrame(analyzed_data)

def plot_comparative_distribution(df, output_path, fp_threshold):
    """
    Generates comparative boxplots for True Positives and False Positives.
    """
    # 1. Define Groups
    # Group A: True Positives (Actual FDA Drugs)
    tp_df = df[df['True_Label'] == 1].copy()
    tp_df['Group'] = 'True Positives (FDA)'
    
    # Group B: False Positives (High Confidence Errors)
    fp_df = df[(df['True_Label'] == 0) & (df['Pred_Prob'] > fp_threshold)].copy()
    fp_df['Group'] = f'False Positives (Prob > {fp_threshold})'
    
    print(f"[-] Statistical Summary:")
    print(f"    - Count of True Positives (FDA): {len(tp_df)}")
    print(f"    - Count of False Positives (High Conf): {len(fp_df)}")
    
    if len(fp_df) < 5:
        print("[!] Warning: Insufficient False Positive samples for reliable statistical analysis.")
    
    if len(tp_df) == 0:
        sys.exit("[!] Error: No True Positive samples found in the dataset.")

    # Combine for plotting
    plot_df = pd.concat([tp_df, fp_df])
    
    # 2. Visualization
    metrics = ['MW', 'LogP', 'TPSA', 'H-Donors', 'H-Acceptors', 'Rotatable Bonds']
    fig, axes = plt.subplots(2, 3, figsize=(16, 10))
    axes = axes.flatten()
    
    palette = {"True Positives (FDA)": "#2ecc71", f'False Positives (Prob > {fp_threshold})': "#e74c3c"}
    
    for i, metric in enumerate(metrics):
        ax = axes[i]
        sns.boxplot(x='Group', y=metric, data=plot_df, ax=ax, palette=palette, showfliers=True)
        
        ax.set_title(metric, fontweight='bold')
        ax.set_xlabel('')
        ax.set_ylabel(metric)
        
        # Calculate and annotate means
        mean_tp = tp_df[metric].mean()
        mean_fp = fp_df[metric].mean()
        
        stats_text = (f"TP Mean: {mean_tp:.1f}\n"
                      f"FP Mean: {mean_fp:.1f}")
        
        ax.text(0.05, 0.95, stats_text, transform=ax.transAxes, 
                fontsize=10, verticalalignment='top', 
                bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="gray", alpha=0.9))

    plt.suptitle(f"Physicochemical Property Distribution: TP vs FP (Threshold={fp_threshold})", fontsize=16, y=1.02)
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"[+] Analysis plot saved successfully to: {output_path}")

def main():
    args = parse_arguments()
    
    # 1. Load Resources
    print(f"[-] Loading model from: {args.model}")
    try:
        rf_model = joblib.load(args.model)
    except FileNotFoundError:
        sys.exit(f"[!] Error: Model file not found at {args.model}")

    print(f"[-] Loading dataset from: {args.csv}")
    try:
        raw_df = pd.read_csv(args.csv)
        required_cols = ['SMILES', 'Score', 'Activity_nM', 'Label']
        if not all(col in raw_df.columns for col in required_cols):
             sys.exit(f"[!] Error: CSV must contain columns: {required_cols}")
    except FileNotFoundError:
        sys.exit(f"[!] Error: CSV file not found at {args.csv}")
        
    # 2. Process Data
    result_df = extract_features_and_predict(rf_model, raw_df)
    
    if result_df.empty:
        sys.exit("[!] Error: No valid molecules could be processed.")
        
    # 3. Generate Report
    plot_comparative_distribution(result_df, args.output, args.threshold)

if __name__ == "__main__":
    main()

```

### 使用方法 (Usage)

#### 1. 查看帮助文档

```bash
python analyze_fp_distribution.py -h

```

**输出示例:**

```text
usage: analyze_fp_distribution.py [-h] -c CSV -m MODEL [-o OUTPUT] [-t THRESHOLD]

Physicochemical Property Analysis: True Positives vs. False Positives

options:
  -h, --help            show this help message and exit
  -c CSV, --csv CSV     Path to the input CSV dataset (must contain SMILES, Score, Activity_nM, Label).
  -m MODEL, --model MODEL
                        Path to the trained model file (.pkl).
  -o OUTPUT, --output OUTPUT
                        Path to save the output plot (default: property_distribution_analysis.png).
  -t THRESHOLD, --threshold THRESHOLD
                        Probability threshold to define 'High Confidence' False Positives (default: 0.5).

```

#### 2. 标准运行（针对测试集）

```bash
python analyze_fp_distribution.py -c "E:\FDA_drugs\FDAdrugs\ml\dataset_split\test_set.csv" -m fda_scorer.pkl

```

#### 3. 自定义输出路径和阈值

如果你想看看得分极高（比如 > 0.8）的假阳性到底长什么样：

```bash
python analyze_fp_distribution.py -c "test_set.csv" -m fda_scorer.pkl -o "High_Conf_FP_Analysis.png" -t 0.8

```

