# flip_all_mrc.py — flip all .mrc maps in a directory inside ChimeraX

from chimerax.core.commands import run
import os, glob

def main(session):
    indir = r"D:\Lijing\Zijie\TNF-TNFR1\J283"   # 这里直接写死目录
    axis = "z"

    files = sorted(glob.glob(os.path.join(indir, "*.mrc")))
    if not files:
        session.logger.warning(f"没有找到 .mrc 文件: {indir}")
        return

    for f in files:
        run(session, f'open "{f}"')
        m1 = session.models.list()[-1]  # 获取最上层的模型（#1）
        id1 = m1.id_string
        run(session, f'volume flip #1')
        m2 = session.models.list()[-1]  # 翻转后的新模型（#2）
        id2 = m2.id_string
        base, ext = os.path.splitext(f)
        out_path = base + "_flip.mrc"

        # 保存的是翻转后的 map (#2)
        run(session, f'save "{out_path}" format mrc model #2')
        run(session, f'close')

        session.logger.info(f"✅ {os.path.basename(f)} -> {os.path.basename(out_path)}")

# ChimeraX 会自动注入 session
main(session)
