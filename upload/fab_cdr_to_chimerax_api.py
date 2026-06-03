import json
from chimerax.core.commands import run

# -----------------------------
# 配置
json_file = r"D:\Lijing\GDWS-Sunjiufeng\GDC10-S0068\GDC10-S0068\fab.json"
contact_color = "yellow"
hbond_color = "cyan"

# 重链红系，轻链蓝系
cdr_colors = {
    "H_CDR1": "#b39ddb",
    "H_CDR2": "#9575cd",
    "H_CDR3": "#7e57c2",
    "L_CDR1": "#64b5f6",  # 轻链L或K
    "L_CDR2": "#42a5f5",
    "L_CDR3": "#2196f3",
    "K_CDR1": "#64b5f6",  # 兼容JSON里轻链用K的情况
    "K_CDR2": "#42a5f5",
    "K_CDR3": "#2196f3"
}

# -----------------------------
# 读取 JSON
with open(json_file, "r", encoding="utf-8") as f:
    cdr_data = json.load(f)

# -----------------------------
# 检查模型
if not session.models.list():
    print("未检测到打开的 PDB 文件")
    exit(1)

# 初始显示设置
run(session, "set bgColor white")
run(session, "hide atoms")
run(session, "show cartoons")
run(session, "style stick")

model1 = session.models.list()[0]  # 原始模型 #1

# -----------------------------
# 清理之前的复制模型，保持 #1 不动
for m in session.models.list()[1:]:
    m.delete()

# -----------------------------
# 获取链信息
chains = {c.chain_id: c for c in model1.chains}

fab_chain_map = {}  # JSON链 -> PDB链
offset_map = {}     # JSON链 -> PDB残基起始偏移

for json_chain, data in cdr_data.items():
    if not data:
        continue
    best_match = None
    best_diff = 1e6
    json_len = data.get("sequence_length", 0)
    for cid, chain in chains.items():
        diff = abs(len(chain.residues) - json_len)
        if diff < best_diff:
            best_diff = diff
            best_match = cid
    if best_match:
        fab_chain_map[json_chain] = best_match
        offset_map[json_chain] = chains[best_match].residues[0].number - 1
        chains.pop(best_match)

# 剩余未匹配的链视为抗原
antigen_chains = list(chains.keys())
antigen_sel = " | ".join([f"/{cid}" for cid in antigen_chains]) if antigen_chains else ""

# -----------------------------
# 收集所有 CDR 信息
cdr_list = []
for json_chain, data in cdr_data.items():
    cdrs = data.get("CDRs", {})
    for cdr_name, info in cdrs.items():
        cdr_list.append((json_chain, cdr_name, info))

num_cdr = len(cdr_list)
if num_cdr == 0:
    print("JSON 中未找到任何 CDR 定义，退出。")
    exit(1)

# -----------------------------
# 复制 #1：需要 1 个抗原模型 + num_cdr 个 CDR 模型
# combine #1 每调用一次会新建一个模型：#2, #3, ...
for i in range(num_cdr + 1):
    run(session, "combine #1")

# 新建模型的 ID 是连续的：#2, #3, ..., #(num_cdr+2)
clone_ids = list(range(2, 2 + num_cdr + 1))
antigen_model_id = clone_ids[0]       # #2 抗原模型
cdr_model_ids = clone_ids[1:]         # 之后每个模型对应一个 CDR

# -----------------------------
# #2 只保留抗原
if antigen_sel:
    run(session, f"sel #{antigen_model_id} & ~({antigen_sel})")
    run(session, "delete sel")

# -----------------------------
# 给每个 CDR 分配一个模型并上色
for (json_chain, cdr_name, info), mdl_id in zip(cdr_list, cdr_model_ids):
    pdb_chain = fab_chain_map.get(json_chain)
    offset = offset_map.get(json_chain, 0)

    if pdb_chain is None:
        print(f"警告：JSON 链 {json_chain} 未匹配到任何 PDB 链，跳过该 CDR：{cdr_name}")
        continue

    start = info.get("start")
    end = info.get("end")
    if start is None or end is None:
        print(f"警告：{json_chain} - {cdr_name} 缺少 start/end，跳过。")
        continue

    start_pdb = start + offset
    end_pdb = end + offset
    sel_str = f"/{pdb_chain}:{start_pdb}-{end_pdb}"

    # 删除除当前CDR片段外的所有残基
    run(session, f"sel #{mdl_id} & ~({sel_str})")
    run(session, "delete sel")

    # 使用 JSON 的 chain_type 来判断 H 或 K/L 链
    chain_type = cdr_data[json_chain].get("chain_type", "K")  # 默认轻链
    color_key = f"{chain_type}_{cdr_name}"
    color = cdr_colors.get(color_key, "yellow")

    run(session, f"sel #{mdl_id}")
    run(session, f"color sel {color}")

# -----------------------------
# 互作分析：只执行一次
# 抗原模型是 antigen_model_id，CDR 模型是一段连续编号
if cdr_model_ids:
    cdr_model_range = f"#{cdr_model_ids[0]}-{cdr_model_ids[-1]}"

    run(
        session,
        f"contacts {cdr_model_range} restrict #{antigen_model_id} select true "
        f"makePseudobonds false reveal true showDist false color {contact_color}"
    )
    run(
        session,
        f"hbonds {cdr_model_range} restrict #{antigen_model_id} reveal true showDist true color {hbond_color} log true"
    )
else:
    print("没有可用的 CDR 模型用于互作分析。")