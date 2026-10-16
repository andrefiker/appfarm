#!/usr/bin/env python3
import re
import sys

def analyze_transcript_interventions(filepath, label="SESSION"):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
        lines = fp.readlines()
    
    andre_turns = []
    current_turn = []
    speaker = None
    
    for l in lines:
        if l.startswith('André Fiker:'):
            if current_turn and speaker == 'Andre':
                andre_turns.append(" ".join(current_turn))
                current_turn = []
            speaker = 'Andre'
            current_turn.append(l.replace('André Fiker:', '').strip())
        elif re.match(r'^[A-Z][a-z]+ [A-Z][a-z]+:', l) or re.match(r'^[a-z]+ [a-z]+:', l):
            if current_turn and speaker == 'Andre':
                andre_turns.append(" ".join(current_turn))
                current_turn = []
            speaker = 'Client'
        else:
            if speaker == 'Andre':
                current_turn.append(l.strip())
                
    if current_turn and speaker == 'Andre':
        andre_turns.append(" ".join(current_turn))
        
    sorted_turns = sorted(andre_turns, key=lambda x: len(x.split()), reverse=True)
    print(f"\n==================== {label.upper()} ====================")
    print(f"Total Therapist Turns: {len(andre_turns)}")
    print("--- Top 3 Most Substantial Therapist Interventions ---")
    for i, t in enumerate(sorted_turns[:3]):
        print(f"\n[{i+1}] ({len(t.split())} words):")
        print(t[:350] + ("..." if len(t) > 350 else ""))
        
    print("\n--- Sample Mid-Session Attunement Turns ---")
    mid = len(andre_turns) // 2
    for t in andre_turns[mid:mid+5]:
        if len(t.split()) > 3:
            print(f"- {t[:200]}")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "formatted_session.txt"
    analyze_transcript_interventions(target)
