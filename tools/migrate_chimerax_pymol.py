#!/usr/bin/env python3
"""
migrate_chimerax_pymol.py
一次性把 19 个 chimerax/pymol 脚本改成 input/output 友好的形式:
1. 替换硬编码路径为 os.environ['INPUT_XXX']
2. 末尾追加 save session (chimerax: run(session, f"save $SESSION_PATH");
                            pymol:    cmd.save(SESSION_PATH))
3. 同步更新 inputFiles / outputFiles JSON 字段
4. 改 language 字段从 'python' 到 'chimerax' / 'pymol' (DB metadata)
"""
import json
import sqlite3
import re
import os
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "db" / "custom.db"


def detect_runtime(content: str) -> str | None:
    """Return 'chimerax' / 'pymol' / None based on imports."""
    if re.search(r"^\s*from\s+chimerax\b|^\s*import\s+chimerax\b", content, re.M):
        return "chimerax"
    if re.search(r"^\s*from\s+pymol\b|^\s*import\s+pymol\b", content, re.M):
        return "pymol"
    return None


# Hardcoded path patterns we want to replace.
# Each entry: (regex, env_var_name, input_name, format)
PATH_PATTERNS = [
    # fab.json (Windows backslashes)
    (
        re.compile(
            r'["\']D:[\\\\/]Lijing[\\\\/]GDWS-Sunjiufeng[\\\\/][^"\']*?fab\.json["\']'
        ),
        "INPUT_FAB_JSON",
        "fab_json",
        "json",
    ),
    # flip all mrc: D:\Lijing\Zijie\TNF-TNFR1\J283 (directory)
    (
        re.compile(
            r'["\']D:[\\\\/]Lijing[\\\\/]Zijie[\\\\/]TNF-TNFR1[\\\\/]J283["\']'
        ),
        "INPUT_MRC_DIR",
        "mrc_dir",
        "mrc",
    ),
    # interaction matrix xlsx (both / and \ separators, "D:/script/..." and "D:\Lijing\...")
    (
        re.compile(
            r'["\']D:[/\\\\](?:script|Lijing[/\\\\][^"\']*?)[/\\\\]interaction_matrix_chimerax\.xlsx["\']'
        ),
        "INPUT_MATRIX_XLSX",
        "matrix_xlsx",
        "xlsx",
    ),
    # nanobody.json
    (
        re.compile(
            r'["\']D:[/\\\\]script[/\\\\]nanobody\.json["\']'
        ),
        "INPUT_NANOBODY_JSON",
        "nanobody_json",
        "json",
    ),
    # interface visualizer: D:/Lijing/ZWFZCXZX-wanli/figure/atp/ (directory)
    (
        re.compile(
            r'["\']D:[/\\\\]Lijing[/\\\\]ZWFZCXZX-wanli[/\\\\]figure[/\\\\]atp[/\\\\]?["\']?'
        ),
        "INPUT_FIGURE_DIR",
        "figure_dir",
        "",
    ),
    # D:/script/screenshots (directory, in tile.py)
    (
        re.compile(
            r'["\']D:[/\\\\]script[/\\\\]screenshots["\']'
        ),
        "INPUT_SCREENSHOTS_DIR",
        "screenshots_dir",
        "",
    ),
]


def replace_hardcoded_paths(content: str) -> tuple[str, list[dict]]:
    """Replace hardcoded path strings with os.environ reads. Returns (new_content, found_inputs)."""
    found_inputs = []
    for pattern, env_var, name, fmt in PATH_PATTERNS:
        m = pattern.search(content)
        if not m:
            continue
        # Extract the literal string as it appears (with the original quotes)
        original = m.group(0)
        # Build the replacement: `os.environ['ENV_VAR']`
        # If the original was assigned to a variable (e.g. `json_file = r"..."`),
        # we want `json_file = os.environ['ENV_VAR']`.
        replacement = f"os.environ['{env_var}']"
        content = content.replace(original, replacement, 1)
        found_inputs.append(
            {
                "name": name,
                "env_var": env_var,
                "format": fmt,
                "description": f"Replaced hardcoded path {original}",
            }
        )
    return content, found_inputs


def append_save_session(content: str, runtime: str, run_id_var: str | None = None) -> str:
    """Append save-session block at end of script if not already present."""
    if runtime == "chimerax":
        block = """
# --- Save ChimeraX session (set by execute route via $SESSION_PATH env var) ---
import os as _os
_session_path = _os.environ.get('SESSION_PATH', _os.path.join(_os.path.dirname(__file__) or '.', 'session.cxs'))
try:
    from chimerax.core.commands import run as _cx_run
    _cx_run(session, f"save {_session_path}")
    print(f"Session saved: {_session_path}")
except Exception as _e:
    print(f"Could not save session: {_e}")
"""
    elif runtime == "pymol":
        block = """
# --- Save PyMOL session (set by execute route via $SESSION_PATH env var) ---
import os as _os
_session_path = _os.environ.get('SESSION_PATH', _os.path.join(_os.path.dirname(__file__) or '.', 'session.pse'))
try:
    from pymol import cmd as _pymol_cmd
    _pymol_cmd.save(_session_path)
    print(f"Session saved: {_session_path}")
except Exception as _e:
    print(f"Could not save session: {_e}")
"""
    else:
        return content

    if "SESSION_PATH" in content and ("save" in content or "_pymol_cmd" in content):
        # Already has save logic referencing SESSION_PATH — don't double-add
        return content
    # Append before the very last line if it's an `if __name__` block, else at end
    if content.endswith("\n"):
        return content + block
    return content + "\n" + block


def ensure_os_import(content: str) -> str:
    """Make sure `import os` is at the top, so the appended block can use it."""
    if re.search(r"^\s*import\s+os\b", content, re.M):
        return content
    if re.search(r"^\s*from\s+os\b", content, re.M):
        return content
    # Insert after shebang or first non-empty line
    lines = content.split("\n")
    insert_idx = 0
    if lines and lines[0].startswith("#!"):
        insert_idx = 1
    # skip docstring
    if insert_idx < len(lines) and lines[insert_idx].lstrip().startswith(('"""', "'''")):
        quote = lines[insert_idx].lstrip()[:3]
        # find end of docstring
        for j in range(insert_idx + 1, len(lines)):
            if quote in lines[j]:
                insert_idx = j + 1
                break
    lines.insert(insert_idx, "import os")
    return "\n".join(lines)


def main():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    rows = cur.execute(
        "SELECT id, name, content, language, inputFiles, outputFiles FROM Script"
    ).fetchall()
    print(f"Scanning {len(rows)} scripts...")

    modified = 0
    for sid, name, content, lang, input_files_json, output_files_json in rows:
        runtime = detect_runtime(content or "")
        if runtime is None:
            continue

        new_content = content
        # 1) replace hardcoded paths
        new_content, path_inputs = replace_hardcoded_paths(new_content)
        # 2) ensure `import os` is at top
        new_content = ensure_os_import(new_content)
        # 3) append save-session block
        new_content = append_save_session(new_content, runtime)

        if new_content == content:
            print(f"  [skip] {name} (no changes)")
            continue

        # 4) update inputFiles: union existing + new path-derived inputs
        try:
            existing_inputs = json.loads(input_files_json or "[]")
        except Exception:
            existing_inputs = []
        for pi in path_inputs:
            # Skip duplicate (same name)
            if any(x.get("name") == pi["name"] for x in existing_inputs):
                continue
            existing_inputs.append(
                {
                    "name": pi["name"],
                    "description": pi["description"],
                    "format": pi["format"],
                    "required": True,
                }
            )
        new_input_files = json.dumps(existing_inputs, ensure_ascii=False)

        # 5) outputFiles: session file
        session_ext = "pse" if runtime == "pymol" else "cxs"
        try:
            existing_outputs = json.loads(output_files_json or "[]")
        except Exception:
            existing_outputs = []
        out_name = f"{name.replace(' ', '_').lower()}_session.{session_ext}"
        # Avoid duplicate
        if not any(x.get("name") == "session_file" for x in existing_outputs):
            existing_outputs.append(
                {
                    "name": "session_file",
                    "description": f"ChimeraX/PyMOL session file (.{session_ext}) containing the model state after script execution. Open it in {runtime.capitalize()} to resume.",
                    "format": session_ext,
                }
            )
        new_output_files = json.dumps(existing_outputs, ensure_ascii=False)

        # 6) update language field
        new_lang = runtime

        cur.execute(
            "UPDATE Script SET content=?, language=?, inputFiles=?, outputFiles=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?",
            (new_content, new_lang, new_input_files, new_output_files, sid),
        )
        print(
            f"  [ok]   {name} → language={new_lang}, +{len(path_inputs)} input(s), +1 output"
        )
        modified += 1

    con.commit()
    con.close()
    print(f"\nDone. {modified} scripts updated.")


if __name__ == "__main__":
    main()
