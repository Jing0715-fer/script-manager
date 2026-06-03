import sys
import os
import tempfile
import urllib.request
import zipfile

# 下载 ANARCI 源码
anarci_url = "https://github.com/oxpig/ANARCI/archive/refs/heads/master.zip"
temp_dir = tempfile.mkdtemp()
zip_path = os.path.join(temp_dir, "anarci.zip")

print("下载 ANARCI 源码...")
urllib.request.urlretrieve(anarci_url, zip_path)

# 解压
print("解压文件...")
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(temp_dir)

anarci_path = os.path.join(temp_dir, "ANARCI-master")
print(f"ANARCI 解压到: {anarci_path}")

# 探索目录结构
print("目录内容:")
for root, dirs, files in os.walk(anarci_path):
    level = root.replace(anarci_path, '').count(os.sep)
    indent = ' ' * 2 * level
    print(f"{indent}{os.path.basename(root)}/")
    subindent = ' ' * 2 * (level + 1)
    for file in files:
        if file.endswith('.py'):
            print(f"{subindent}{file}")

# 尝试找到正确的模块路径
anarci_module_path = None
possible_paths = [
    os.path.join(anarci_path, "ANARCI"),
    os.path.join(anarci_path, "lib"),
    os.path.join(anarci_path, "src"),
    anarci_path  # 直接使用根目录
]

for path in possible_paths:
    if os.path.exists(path):
        sys.path.insert(0, path)
        print(f"添加路径到sys.path: {path}")

# 设置环境变量
os.environ['ANARCI'] = anarci_path

# 尝试导入
try:
    # 尝试直接导入ANARCI模块
    from ANARCI import ANARCI
    print("成功导入 ANARCI 模块!")
    
    # 测试功能
    sequences = ["EVQLVESGGGLVQPGGSLRLSCAASGFDFSRYAMSWVRQAPGKGLEWVSAISGSGGSTYYADSVKGRFTISRDNSKNTLYLQMNSLRAEDTAVYYCAR"]
    result = ANARCI.anarci(sequences)
    print("ANARCI 功能测试成功!")
    
except ImportError as e:
    print(f"导入失败: {e}")
    print("尝试其他导入方式...")
    
    # 尝试导入anarci模块
    try:
        import anarci
        print("成功导入 anarci 模块!")
    except ImportError as e2:
        print(f"另一种导入方式也失败: {e2}")