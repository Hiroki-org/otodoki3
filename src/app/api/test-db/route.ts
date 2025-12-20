// src/app/api/test-db/route.ts
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        // 環境変数チェック
        console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

        // RPC経由で現在時刻を取得（テーブル不要）
        const { data, error } = await supabase.rpc('now').maybeSingle()

        if (error) {
            console.error('Supabase error:', error)
            // rpcが無くてもエラーコードで接続確認
            if (error.code === 'PGRST202') {
                // function not found = 接続自体はOK
                return NextResponse.json({
                    status: 'connected',
                    message: 'Supabase connection OK (no RPC defined)',
                    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
                })
            }
            throw error
        }

        return NextResponse.json({
            status: 'connected',
            message: 'Supabase connection successful',
            serverTime: data,
        })
    } catch (err) {
        console.error('Catch error:', err)
        return NextResponse.json(
            {
                status: 'error',
                message: err instanceof Error ? err.message : String(err),
                details: err,
            },
            { status: 500 }
        )
    }
}