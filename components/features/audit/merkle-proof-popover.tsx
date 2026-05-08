'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CopyableHash } from '@/components/common/copyable-hash'
import { Sparkles } from 'lucide-react'

export function MerkleProofPopover({ proof, hash }: { proof: string[] | undefined; hash: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs"><Sparkles className="size-3" /> proof</Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="grid gap-2 text-xs">
          <p className="font-tag text-foreground/55">// entry hash</p>
          <CopyableHash value={hash} short={false} />
          {proof && proof.length > 0 && (
            <>
              <p className="font-tag text-foreground/55 pt-2">// merkle siblings</p>
              <div className="grid gap-1">
                {proof.map((p, i) => <CopyableHash key={i} value={p} short={false} />)}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
