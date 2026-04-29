import os

def aggregate_codebase(output_file="PROJECT_CONTEXT_FOR_AI.md"):
    # Folders and extensions to ignore
    ignore_folders = {'node_modules', 'venv', '.git', '__pycache__', 'dist', 'build', '.vercel', 'sample images'}
    ignore_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.exe', '.pyc', '.mjs.timestamp'}
    
    # Files specifically to ignore
    ignore_files = {'package-lock.json', 'db.sqlite3', 'PROJECT_CONTEXT_FOR_AI.md', 'aggregator.py'}

    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write("# OSAConnect Full Codebase Context\n")
        outfile.write("This file contains the complete source code for the OSAConnect project, provided for AI analysis.\n\n")
        
        # Write Directory Structure
        outfile.write("## Directory Structure\n```text\n")
        for root, dirs, files in os.walk('.'):
            # Prune ignore folders
            dirs[:] = [d for d in dirs if d not in ignore_folders]
            
            level = root.replace('.', '').count(os.sep)
            indent = ' ' * 4 * (level)
            outfile.write(f"{indent}{os.path.basename(root)}/\n")
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                if f not in ignore_files and os.path.splitext(f)[1] not in ignore_extensions:
                    outfile.write(f"{subindent}{f}\n")
        outfile.write("```\n\n")

        # Write File Contents
        outfile.write("## Source Code Files\n\n")
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in ignore_folders]
            for f in files:
                if f in ignore_files: continue
                ext = os.path.splitext(f)[1]
                if ext in ignore_extensions: continue
                
                file_path = os.path.join(root, f)
                relative_path = os.path.relpath(file_path, '.')
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                        outfile.write(f"### File: {relative_path}\n")
                        # Guess language for markdown highlighting
                        lang = ext[1:] if ext.startswith('.') else ""
                        if lang == "jsx": lang = "javascript"
                        if lang == "py": lang = "python"
                        
                        outfile.write(f"```{lang}\n")
                        outfile.write(content)
                        outfile.write("\n```\n\n")
                except Exception as e:
                    outfile.write(f"### File: {relative_path} (Failed to read: {e})\n\n")

    print(f"Success! Codebase aggregated into {output_file}")

if __name__ == "__main__":
    aggregate_codebase()
