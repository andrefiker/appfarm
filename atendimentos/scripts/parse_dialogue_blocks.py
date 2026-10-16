#!/usr/bin/env python3
import re
import sys

def parse_transcript(filepath):
    """
    Parses Google Meet and Gemini transcripts into structured dialogue turns:
    [(speaker_name, dialogue_text), ...]
    """
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
        lines = fp.readlines()
        
    dialogues = []
    current_speaker = None
    current_text = []
    
    for line in lines:
        line_s = line.strip()
        if not line_s or line_s.startswith('#') or line_s.startswith('**Duração') or line_s.startswith('**Participantes'):
            continue
        
        # Matches patterns like 'André Fiker: ...' or 'Participant Name: ...'
        m = re.match(r'^(André Fiker|[A-Z][a-z]+ [A-Z][a-z]+|[a-z]+ [a-z]+):\s*(.*)', line_s)
        if m:
            speaker = m.group(1).title()
            text = m.group(2).strip()
            if speaker == current_speaker:
                current_text.append(text)
            else:
                if current_speaker and current_text:
                    dialogues.append((current_speaker, " ".join(current_text)))
                current_speaker = speaker
                current_text = [text]
        else:
            if current_speaker:
                current_text.append(line_s)
                
    if current_speaker and current_text:
        dialogues.append((current_speaker, " ".join(current_text)))
        
    return dialogues

if __name__ == "__main__":
    if len(sys.argv) > 1:
        d = parse_transcript(sys.argv[1])
        andre_blocks = [t for s, t in d if 'André' in s]
        client_blocks = [t for s, t in d if 'André' not in s]
        print(f"Total turns: {len(d)}")
        print(f"Therapist turns: {len(andre_blocks)}, Words: {sum(len(b.split()) for b in andre_blocks)}")
        print(f"Client turns: {len(client_blocks)}, Words: {sum(len(b.split()) for b in client_blocks)}")
