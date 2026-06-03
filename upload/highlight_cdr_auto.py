import json
import os
from chimerax.core.commands import run

def run_script(session):
    # -----------------------------
    # 自动检测 JSON 文件路径（和脚本同目录）
    # -----------------------------
    script_dir = os.path.dirname(__file__)
    json_file = os.path.join(script_dir, "cdr_ranges.json")

    if not os.path.exists(json_file):
        print(f"[ERROR] JSON 文件不存在: {json_file}")
        return

    # -----------------------------
    # CDR 对应颜色
    # -----------------------------
    colors = {"CDR1": "red", "CDR2": "orange", "CDR3": "yellow"}

    # -----------------------------
    # 获取当前打开的第一个模型
    # -----------------------------
    if not session.models.list():
        print("[ERROR] 没有打开 PDB 模型，请先手动打开 PDB")
        return

    model = session.models.list()[0]

    # -----------------------------
    # 自动识别重链和轻链
    # 假设重链较长，轻链较短
    # -----------------------------
    chain_lengths = {c.chain_id: sum(1 for r in c.residues) for c in model.chains}
    heavy_chain = max(chain_lengths, key=chain_lengths.get)
    light_chain = min(chain_lengths, key=chain_lengths.get)
    chain_map = {"H": heavy_chain, "L": light_chain}

    # -----------------------------
    # 读取 JSON 并上色
    # -----------------------------
    with open(json_file) as f:
        cdrs = json.load(f)

    for chain_key, ranges in cdrs.items():
        chain_id = chain_map[chain_key]
        for cdr, (start, end) in ranges.items():
            run(session, f"select :{start}-{end}.{chain_id}")
            run(session, f"color {colors[cdr]} sel")

    # 显示 cartoon
    run(session, "cartoon")

# 调用脚本
run_script(session)
