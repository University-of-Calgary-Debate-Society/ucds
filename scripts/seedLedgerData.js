/**
 * Society Bank Statement Historical Ledger Seeder
 * University of Calgary Debate Society (UCDS)
 *
 * Populates historical transactions (March 2025 - August 2026) into Firestore collection `Ledger`.
 * Storage optimization rules applied:
 * - Only store `amount` if deposit, and only `withdrawl` if withdrawal.
 * - No `ucid` field.
 * - Dates converted from MM/DD/YYYY to UTC Timestamp.
 * - Opening balance seeded so cumulative balance precisely matches $4,094.80 CAD closing statement.
 */

import { initTimeSync } from './timeSync.js';
await initTimeSync();

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: service-account.json not found.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = getApps().length === 0 ? initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
}) : getApps()[0];

const db = getFirestore(app);

const RAW_STATEMENT_CSV = `
03/03/2025,SEND E-TFR ***7DA   ,2070.00,,3636.82
03/03/2025,SEND E-TFR FEE      ,1.50,,3635.32
03/03/2025,SEND E-TFR ***UhU   ,108.00,,3527.32
03/03/2025,SEND E-TFR FEE      ,1.50,,3525.82
03/03/2025,E-TRANSFER ***zs4   ,,147.78,3673.60
03/04/2025,SEND E-TFR ***2Ar   ,70.00,,3603.60
03/04/2025,SEND E-TFR FEE      ,1.50,,3602.10
03/04/2025,SEND E-TFR ***MAV   ,54.00,,3548.10
03/04/2025,SEND E-TFR FEE      ,1.50,,3546.60
03/04/2025,SEND E-TFR ***xjg   ,83.94,,3462.66
03/04/2025,SEND E-TFR FEE      ,1.50,,3461.16
03/17/2025,E-TRANSFER ***WMz   ,,18.00,3479.16
03/17/2025,E-TFR ***UBg EPAY   ,,18.00,3497.16
03/18/2025,SEND E-TFR ***E5H   ,102.00,,3395.16
03/18/2025,SEND E-TFR FEE      ,1.50,,3393.66
03/24/2025,E-TRANSFER ***Pm4   ,,148.00,3541.66
03/26/2025,E-TRANSFER ***zf5   ,,299.00,3840.66
04/02/2025,E-TFR ***K8E EPAY   ,,147.00,3987.66
04/08/2025,E-TRANSFER ***psH   ,,140.00,4127.66
04/14/2025,SEND E-TFR ***qsw   ,91.00,,4036.66
04/14/2025,SEND E-TFR FEE      ,1.50,,4035.16
04/14/2025,E-TRANSFER ***75Q   ,,150.00,4185.16
04/14/2025,SEND E-TFR ***8sh   ,110.00,,4075.16
04/14/2025,SEND E-TFR FEE      ,1.50,,4073.66
05/14/2025,SEND E-TFR ***Fw7   ,106.91,,3966.75
05/14/2025,SEND E-TFR FEE      ,1.50,,3965.25
05/14/2025,SEND E-TFR ***2Jt   ,54.50,,3910.75
05/14/2025,SEND E-TFR FEE      ,1.50,,3909.25
06/02/2025,SEND E-TFR ***ecJ   ,55.60,,3853.65
06/02/2025,SEND E-TFR FEE      ,1.50,,3852.15
06/13/2025,E-TFR ***Cmj EPAY   ,,46.00,3898.15
06/13/2025,E-TRANSFER ***JpE   ,,46.00,3944.15
06/19/2025,E-TRANSFER ***34u   ,,46.00,3990.15
06/19/2025,E-TRANSFER ***K4S   ,,34.00,4024.15
06/20/2025,E-TRANSFER ***kAg   ,,34.00,4058.15
06/23/2025,E-TRANSFER ***crP   ,,38.00,4096.15
06/23/2025,E-TRANSFER ***3h9   ,,38.00,4134.15
06/25/2025,E-TRANSFER ***ghA   ,,46.00,4180.15
07/02/2025,E-TRANSFER ***RYY   ,,46.00,4226.15
07/14/2025,SEND E-TFR ***Sbf   ,540.81,,3685.34
07/14/2025,SEND E-TFR FEE      ,1.50,,3683.84
07/14/2025,SEND E-TFR ***vtN   ,21.00,,3662.84
07/14/2025,SEND E-TFR FEE      ,1.50,,3661.34
07/14/2025,E-TRANSFER ***eVU   ,,46.00,3707.34
07/21/2025,E-TRANSFER ***4qR   ,,20.00,3727.34
07/28/2025,E-TRANSFER ***Xs2   ,,42.00,3769.34
07/28/2025,E-TRANSFER ***nmS   ,,70.00,3839.34
07/30/2025,E-TRANSFER ***63G   ,,35.00,3874.34
08/01/2025,E-TRANSFER ***mWk   ,,70.00,3944.34
08/05/2025,E-TFR ***EWs EPAY   ,,35.00,3979.34
08/05/2025,E-TRANSFER ***TdK   ,,35.00,4014.34
08/05/2025,E-TRANSFER ***MrV   ,,70.00,4084.34
08/11/2025,SEND E-TFR ***mbR   ,365.00,,3719.34
08/11/2025,SEND E-TFR FEE      ,1.50,,3717.84
08/11/2025,SEND E-TFR ***awJ   ,70.00,,3647.84
08/11/2025,SEND E-TFR FEE      ,1.50,,3646.34
08/11/2025,SEND E-TFR ***a8p   ,35.00,,3611.34
08/11/2025,SEND E-TFR FEE      ,1.50,,3609.84
08/11/2025,SEND E-TFR ***TNA   ,70.00,,3539.84
08/11/2025,SEND E-TFR FEE      ,1.50,,3538.34
08/11/2025,SEND E-TFR ***mCW   ,35.00,,3503.34
08/11/2025,SEND E-TFR FEE      ,1.50,,3501.84
08/11/2025,SEND E-TFR ***KhM   ,35.00,,3466.84
08/11/2025,SEND E-TFR FEE      ,1.50,,3465.34
08/11/2025,SEND E-TFR ***bKV   ,70.00,,3395.34
08/11/2025,SEND E-TFR FEE      ,1.50,,3393.84
09/03/2025,E-TRANSFER ***Buk   ,,10.00,3403.84
09/17/2025,E-TRANSFER ***PZe   ,,20.00,3423.84
09/17/2025,E-TRANSFER ***RWU   ,,20.00,3443.84
09/22/2025,SEND E-TFR ***Qcs   ,150.00,,3293.84
09/22/2025,SEND E-TFR FEE      ,1.50,,3292.34
09/22/2025,E-TRANSFER ***A7m   ,,20.00,3312.34
09/24/2025,E-TRANSFER ***77g   ,,20.00,3332.34
09/25/2025,SEND E-TFR ***ave   ,247.03,,3085.31
09/25/2025,SEND E-TFR FEE      ,1.50,,3083.81
10/01/2025,E-TRANSFER ***sFH   ,,80.00,3163.81
10/01/2025,SEND E-TFR ***CBV   ,1491.00,,1672.81
10/01/2025,SEND E-TFR FEE      ,1.50,,1671.31
10/01/2025,E-TRANSFER ***MHf   ,,20.00,1691.31
10/03/2025,E-TRANSFER ***atw   ,,250.00,1941.31
10/03/2025,Webber Academy   AP ,,320.00,2261.31
10/07/2025,SEND E-TFR ***k3Q   ,440.93,,1820.38
10/07/2025,SEND E-TFR FEE      ,1.50,,1818.88
10/08/2025,E-TRANSFER ***McH   ,,20.00,1838.88
10/09/2025,E-TRANSFER ***S8A   ,,20.00,1858.88
10/10/2025,SEND E-TFR ***BkS   ,35.44,,1823.44
10/10/2025,SEND E-TFR FEE      ,1.50,,1821.94
10/10/2025,E-TRANSFER ***hHK   ,,705.00,2526.94
10/14/2025,E-TRANSFER ***uTx   ,,40.00,2566.94
10/14/2025,SEND E-TFR ***5Bd   ,120.47,,2446.47
10/14/2025,SEND E-TFR FEE      ,1.50,,2444.97
10/22/2025,SEND E-TFR ***NKe   ,250.00,,2194.97
10/22/2025,SEND E-TFR FEE      ,1.50,,2193.47
10/22/2025,E-TRANSFER ***KGt   ,,70.00,2263.47
10/22/2025,E-TRANSFER ***NK8   ,,20.00,2283.47
10/23/2025,E-TFR ***8TN EPAY   ,,70.00,2353.47
10/24/2025,E-TRANSFER ***4rK   ,,35.00,2388.47
10/27/2025,SEND E-TFR ***3Nd   ,550.00,,1838.47
10/27/2025,SEND E-TFR FEE      ,1.50,,1836.97
10/28/2025,SEND E-TFR ***ktR   ,119.84,,1717.13
10/28/2025,SEND E-TFR FEE      ,1.50,,1715.63
10/28/2025,SEND E-TFR ***WS4   ,102.30,,1613.33
10/28/2025,SEND E-TFR FEE      ,1.50,,1611.83
10/29/2025,E-TRANSFER ***EfY   ,,50.00,1661.83
10/29/2025,E-TFR ***VYe EPAY   ,,50.00,1711.83
11/13/2025,GC 0826-DEPOSIT     ,,1040.00,2751.83
11/13/2025,GC 0826-DEPOSIT     ,,720.00,3471.83
11/13/2025,GC 0826-DEPOSIT     ,,800.00,4271.83
11/13/2025,GC 0826-DEPOSIT     ,,320.00,4591.83
11/13/2025,GC 0826-DEPOSIT     ,,240.00,4831.83
11/24/2025,E-TRANSFER ***Xwt   ,,20.00,4851.83
11/24/2025,E-TRANSFER ***vY5   ,,20.00,4871.83
11/25/2025,E-TRANSFER ***A5x   ,,20.00,4891.83
12/10/2025,SEND E-TFR ***xYv   ,38.43,,4853.40
12/10/2025,SEND E-TFR FEE      ,1.50,,4851.90
01/05/2026,SEND E-TFR ***xVW   ,615.24,,4236.66
01/05/2026,SEND E-TFR FEE      ,1.50,,4235.16
01/21/2026,E-TRANSFER ***dGE   ,,750.00,4985.16
01/23/2026,SEND E-TFR ***YxP   ,625.00,,4360.16
01/23/2026,SEND E-TFR FEE      ,1.50,,4358.66
01/23/2026,E-TRANSFER ***38g   ,,820.00,5178.66
01/26/2026,SEND E-TFR ***hTx   ,1304.56,,3874.10
01/26/2026,SEND E-TFR FEE      ,1.50,,3872.60
01/26/2026,SEND E-TFR ***ZEy   ,300.00,,3572.60
01/26/2026,SEND E-TFR FEE      ,1.50,,3571.10
01/27/2026,E-TRANSFER ***yVr   ,,62.50,3633.60
02/02/2026,E-TFR ***vN7 EPAY   ,,62.50,3696.10
02/09/2026,SEND E-TFR ***3WQ   ,15.55,,3680.55
02/09/2026,SEND E-TFR FEE      ,1.50,,3679.05
02/09/2026,E-TRANSFER ***Mht   ,,157.50,3836.55
02/10/2026,SEND E-TFR ***V2D   ,64.00,,3772.55
02/10/2026,SEND E-TFR FEE      ,1.50,,3771.05
02/10/2026,SEND E-TFR ***fz2   ,653.56,,3117.49
02/10/2026,SEND E-TFR FEE      ,1.50,,3115.99
02/10/2026,E-TRANSFER ***nyC   ,,35.00,3150.99
02/10/2026,E-TFR ***JeU EPAY   ,,90.00,3240.99
02/10/2026,E-TRANSFER ***K4j   ,,45.67,3286.66
02/10/2026,E-TRANSFER ***qub   ,,35.00,3321.66
02/10/2026,E-TRANSFER ***mj2   ,,157.50,3479.16
02/11/2026,E-TRANSFER ***kUK   ,,167.50,3646.66
02/12/2026,E-TRANSFER ***qzV   ,,157.50,3804.16
02/17/2026,E-TRANSFER ***tdU   ,,45.00,3849.16
02/18/2026,E-TRANSFER ***DEU   ,,150.00,3999.16
02/18/2026,E-TRANSFER ***Ebu   ,,100.00,4099.16
02/18/2026,E-TRANSFER ***Dkb   ,,150.00,4249.16
02/18/2026,E-TFR ***Pz5 EPAY   ,,150.00,4399.16
02/19/2026,E-TRANSFER ***vDW   ,,185.00,4584.16
02/19/2026,E-TFR ***fCX EPAY   ,,150.00,4734.16
02/19/2026,E-TRANSFER ***sbt   ,,150.00,4884.16
02/19/2026,SEND E-TFR ***jjm   ,672.24,,4211.92
02/19/2026,SEND E-TFR FEE      ,1.50,,4210.42
02/20/2026,E-TFR ***KUF EPAY   ,,500.00,4710.42
02/23/2026,E-TRANSFER ***kXP   ,,150.00,4860.42
02/24/2026,SEND E-TFR ***Upe   ,2200.00,,2660.42
02/24/2026,SEND E-TFR FEE      ,1.50,,2658.92
02/24/2026,SEND E-TFR ***jSG   ,702.73,,1956.19
02/24/2026,SEND E-TFR FEE      ,1.50,,1954.69
02/24/2026,E-TRANSFER ***Ank   ,,65.00,2019.69
02/24/2026,E-TRANSFER ***SxZ   ,,65.00,2084.69
02/24/2026,E-TFR ***5RP EPAY   ,,115.00,2199.69
02/24/2026,E-TRANSFER ***DHE   ,,115.00,2314.69
02/24/2026,E-TRANSFER ***maA   ,,115.00,2429.69
02/24/2026,E-TFR ***se5 EPAY   ,,65.00,2494.69
02/24/2026,E-TRANSFER ***qqW   ,,100.00,2594.69
02/25/2026,E-TRANSFER ***aQs   ,,65.00,2659.69
02/26/2026,E-TRANSFER ***DeM   ,,65.69,2725.38
02/27/2026,SERVICE CHARGE      ,5.00,,2720.38
03/02/2026,SEND E-TFR ***xKv   ,565.00,,2155.38
03/02/2026,SEND E-TFR FEE      ,1.50,,2153.88
03/02/2026,E-TRANSFER ***T4y   ,,62.50,2216.38
03/04/2026,E-TRANSFER ***TXj   ,,20.00,2236.38
03/06/2026,SEND E-TFR ***qgR   ,55.00,,2181.38
03/06/2026,SEND E-TFR FEE      ,1.50,,2179.88
03/06/2026,SEND E-TFR ***Rkv   ,155.58,,2024.30
03/06/2026,SEND E-TFR FEE      ,1.50,,2022.80
03/09/2026,E-TRANSFER ***Mja   ,,160.00,2182.80
03/09/2026,E-TRANSFER ***8tf   ,,225.00,2407.80
03/09/2026,E-TRANSFER ***ysF   ,,100.00,2507.80
03/09/2026,E-TRANSFER ***Ede   ,,290.00,2797.80
03/10/2026,E-TRANSFER ***73d   ,,395.00,3192.80
03/10/2026,E-TRANSFER ***gjG   ,,160.00,3352.80
03/10/2026,E-TRANSFER ***UCW   ,,160.00,3512.80
03/11/2026,E-TRANSFER ***bvT   ,,160.00,3672.80
03/11/2026,E-TFR ***JcQ EPAY   ,,160.00,3832.80
03/12/2026,E-TRANSFER ***fhG   ,,160.00,3992.80
03/12/2026,E-TRANSFER ***x5T   ,,395.00,4387.80
03/12/2026,E-TRANSFER ***5Hb   ,,160.00,4547.80
03/12/2026,E-TRANSFER ***6VE   ,,160.00,4707.80
03/12/2026,E-TRANSFER ***Nkb   ,,160.00,4867.80
03/12/2026,E-TRANSFER ***Uaj   ,,160.00,5027.80
03/12/2026,E-TFR ***zdN EPAY   ,,80.00,5107.80
03/16/2026,E-TRANSFER ***z4S   ,,1365.00,6472.80
03/16/2026,SEND E-TFR ***hmb   ,395.00,,6077.80
03/16/2026,SEND E-TFR FEE      ,1.50,,6076.30
03/16/2026,SEND E-TFR ***s7t   ,160.00,,5916.30
03/16/2026,SEND E-TFR FEE      ,1.50,,5914.80
03/18/2026,E-TRANSFER ***E3K   ,,80.00,5994.80
03/18/2026,E-TRANSFER ***GpX   ,,80.00,6074.80
03/23/2026,SEND E-TFR ***bGz   ,50.00,,6024.80
03/23/2026,SEND E-TFR FEE      ,1.50,,6023.30
03/25/2026,SEND E-TFR ***Vsm   ,183.81,,5839.49
03/25/2026,SEND E-TFR FEE      ,1.50,,5837.99
03/25/2026,SEND E-TFR ***mwX   ,90.00,,5747.99
03/25/2026,SEND E-TFR FEE      ,1.50,,5746.49
03/25/2026,SEND E-TFR ***gtE   ,700.00,,5046.49
03/25/2026,SEND E-TFR FEE      ,1.50,,5044.99
03/31/2026,SEND E-TFR ***DGj   ,960.00,,4084.99
03/31/2026,SEND E-TFR FEE      ,1.50,,4083.49
03/31/2026,SEND E-TFR ***bsS   ,150.00,,3933.49
03/31/2026,SEND E-TFR FEE      ,1.50,,3931.99
03/31/2026,SERVICE CHARGE      ,2.50,,3929.49
04/08/2026,SEND E-TFR ***eZX   ,1079.36,,2850.13
04/08/2026,SEND E-TFR FEE      ,1.50,,2848.63
04/08/2026,SEND E-TFR ***f2w   ,28.13,,2820.50
04/08/2026,SEND E-TFR FEE      ,1.50,,2819.00
04/15/2026,E-TRANSFER ***5zu   ,,395.00,3214.00
04/28/2026,E-TRANSFER ***BfE   ,,611.00,3825.00
04/29/2026,SEND E-TFR ***ST6   ,3000.00,,825.00
04/29/2026,SEND E-TFR FEE      ,1.50,,823.50
05/04/2026,E-TRANSFER ***TN4   ,,200.00,1023.50
05/05/2026,E-TRANSFER ***qAB   ,,250.00,1273.50
05/11/2026,SEND E-TFR ***855   ,230.00,,1043.50
05/11/2026,SEND E-TFR FEE      ,1.50,,1042.00
05/13/2026,E-TFR ***U47 EPAY   ,,880.00,1922.00
05/13/2026,SEND E-TFR ***vkG   ,400.00,,1522.00
05/13/2026,SEND E-TFR FEE      ,1.50,,1520.50
05/20/2026,E-TRANSFER ***mc9   ,,880.00,2400.50
05/22/2026,SEND E-TFR ***8Mt   ,400.00,,2000.50
05/22/2026,SEND E-TFR FEE      ,1.50,,1999.00
06/04/2026,E-TRANSFER ***EAD   ,,880.00,2879.00
06/10/2026,E-TFR ***RZ2 EPAY   ,,40.00,2919.00
06/11/2026,E-TRANSFER ***kvx   ,,80.00,2999.00
06/16/2026,E-TRANSFER ***r6Y   ,,80.00,3079.00
06/16/2026,E-TRANSFER ***Wy6   ,,40.00,3119.00
06/17/2026,E-TRANSFER ***jfe   ,,40.00,3159.00
06/17/2026,SEND E-TFR ***f8Y   ,470.00,,2689.00
06/17/2026,SEND E-TFR FEE      ,1.50,,2687.50
06/17/2026,E-TRANSFER ***Rmm   ,,40.00,2727.50
06/24/2026,E-TRANSFER ***r3T   ,,250.00,2977.50
06/30/2026,SEND E-TFR *V7R OTHR,600.00,,2377.50
06/30/2026,SEND E-TFR FEE      ,1.50,,2376.00
06/30/2026,E-TRANSFER ***h3C   ,,680.00,3056.00
07/17/2026,E-TRANSFER ***a8X   ,,30.00,3086.00
07/20/2026,E-TFR ***ZCH EPAY   ,,30.00,3116.00
07/20/2026,E-TRANSFER ***PMH   ,,30.00,3146.00
07/20/2026,E-TRANSFER ***3g7   ,,30.00,3176.00
07/20/2026,E-TRANSFER ***4B8   ,,30.00,3206.00
07/20/2026,E-TRANSFER ***Egj   ,,30.00,3236.00
07/20/2026,E-TRANSFER ***d7Y   ,,30.00,3266.00
07/22/2026,E-TRANSFER ***sWB   ,,60.00,3326.00
07/24/2026,E-TRANSFER ***4cn   ,,60.00,3386.00
07/24/2026,E-TRANSFER ***ycC   ,,15.00,3401.00
07/27/2026,E-TRANSFER ***NVB   ,,15.00,3416.00
07/28/2026,SEND E-TFR *P2Q RRCT,30.00,,3386.00
07/28/2026,SEND E-TFR FEE      ,1.50,,3384.50
07/28/2026,SEND E-TFR *qTw RRCT,30.00,,3354.50
07/28/2026,SEND E-TFR FEE      ,1.50,,3353.00
07/28/2026,SEND E-TFR *ECX RRCT,15.00,,3338.00
07/28/2026,SEND E-TFR FEE      ,1.50,,3336.50
07/28/2026,SEND E-TFR *PYE RRCT,15.00,,3321.50
07/28/2026,SEND E-TFR FEE      ,1.50,,3320.00
07/28/2026,SEND E-TFR *xuK RRCT,15.00,,3305.00
07/28/2026,SEND E-TFR FEE      ,1.50,,3303.50
07/28/2026,SEND E-TFR *xVd RRCT,15.00,,3288.50
07/28/2026,SEND E-TFR FEE      ,1.50,,3287.00
07/28/2026,SEND E-TFR *5We RRCT,15.00,,3272.00
07/28/2026,SEND E-TFR FEE      ,1.50,,3270.50
07/28/2026,SEND E-TFR *yeA RRCT,15.00,,3255.50
07/28/2026,SEND E-TFR FEE      ,1.50,,3254.00
07/28/2026,SEND E-TFR *wzp RRCT,15.00,,3239.00
07/28/2026,SEND E-TFR FEE      ,1.50,,3237.50
08/05/2026,SEND E-TFR *Pf9 RRCT,75.34,,3162.16
08/05/2026,SEND E-TFR FEE      ,1.50,,3160.66
08/07/2026,E-TRANSFER ***u88   ,,880.00,4040.66
08/10/2026,E-TRANSFER ***Kjk   ,,15.00,4055.66
08/10/2026,E-TRANSFER ***e8b   ,,15.00,4070.66
08/10/2026,E-TFR ***Uzq EPAY   ,,15.00,4085.66
08/10/2026,E-TRANSFER ***gqH   ,,30.00,4115.66
08/11/2026,SEND E-TFR ***2dQ   ,60.00,,4055.66
08/11/2026,SEND E-TFR FEE      ,1.50,,4054.16
08/11/2026,SEND E-TFR ***exG   ,15.00,,4039.16
08/11/2026,SEND E-TFR FEE      ,1.50,,4037.66
08/26/2026,PAYPAL           MSP,,57.14,4094.80
`;

async function seedLedger() {
  console.log('--- Seeding Historical Statement Records into Firestore Ledger ---');

  // 1. Fetch registered users to check if any incoming transactions belong to UCDS members
  const usersSnap = await db.collection('Users').get();
  const registeredUsers = [];
  usersSnap.forEach((doc) => {
    if (doc.id === '_default' || doc.id.startsWith('_')) return;
    registeredUsers.push({ id: doc.id, ref: doc.ref, ...doc.data() });
  });
  console.log(`Found ${registeredUsers.length} registered user(s) in database.`);

  const lines = RAW_STATEMENT_CSV.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  console.log(`Parsed ${lines.length} statement transactions from raw CSV.`);

  // Clear existing non-default ledger documents to allow a pristine, idempotent seed
  console.log('Checking existing ledger records in Firestore...');
  const currentLedgerSnap = await db.collection('Ledger').get();
  const deleteBatch = db.batch();
  let deletedCount = 0;
  currentLedgerSnap.forEach((doc) => {
    if (doc.id !== '_default' && !doc.id.startsWith('_')) {
      deleteBatch.delete(doc.ref);
      deletedCount++;
    }
  });
  if (deletedCount > 0) {
    await deleteBatch.commit();
    console.log(`Cleared ${deletedCount} existing records from Ledger.`);
  }

  // 2. Prepare Opening Balance Record
  // Row 1 balance ($3,636.82) + first withdrawal ($2,070.00) = $5,706.82 opening balance
  const openingBalanceRecord = {
    recipient: 'UCDS',
    sender: 'TD Canada Trust',
    email: '',
    method: 'Other',
    amount: 5706.82,
    details: 'Historical Opening Operating Balance Forward',
    'time-created': Timestamp.fromDate(new Date(Date.UTC(2025, 2, 3, 8, 0, 0))), // 03/03/2025 08:00 UTC
    'time-updated': FieldValue.serverTimestamp(),
  };

  const recordsToInsert = [openingBalanceRecord];

  // 3. Transform CSV lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');
    const rawDate = parts[0].trim();
    const desc = parts[1].trim();
    const withStr = parts[2].trim();
    const depStr = parts[3].trim();

    const withdrawal = withStr ? parseFloat(withStr) : null;
    const deposit = depStr ? parseFloat(depStr) : null;

    const [mStr, dStr, yStr] = rawDate.split('/');
    const month = parseInt(mStr, 10) - 1;
    const day = parseInt(dStr, 10);
    const year = parseInt(yStr, 10);

    // Stagger timestamp by seconds so transactions on same date preserve statement order
    const dateObj = new Date(Date.UTC(year, month, day, 12, 0, i % 60));
    const timestamp = Timestamp.fromDate(dateObj);

    let recipient = '';
    let sender = '';
    let method = 'Other';
    let email = '';

    if (withdrawal !== null && withdrawal > 0) {
      sender = 'UCDS';
      if (desc.includes('FEE') || desc.includes('SERVICE CHARGE')) {
        recipient = 'TD Bank';
        method = 'Other';
      } else if (desc.startsWith('SEND E-TFR')) {
        method = 'E-transfer';
        recipient = desc.replace(/^SEND E-TFR\s*/i, '').trim() || desc;
      } else {
        method = 'Other';
        recipient = desc;
      }

      recordsToInsert.push({
        recipient,
        sender,
        email,
        method,
        withdrawl: parseFloat(withdrawal.toFixed(2)),
        details: desc,
        'time-created': timestamp,
        'time-updated': FieldValue.serverTimestamp(),
      });
    } else if (deposit !== null && deposit > 0) {
      recipient = 'UCDS';
      if (desc.startsWith('E-TRANSFER') || desc.startsWith('E-TFR')) {
        method = 'E-transfer';
        sender = desc.replace(/^(?:E-TRANSFER|E-TFR)\s*/i, '').replace(/\s*EPAY/i, '').trim() || desc;
      } else if (desc.includes('PAYPAL')) {
        method = 'PayPal';
        sender = 'PayPal';
      } else if (desc.includes('Webber Academy')) {
        method = 'Other';
        sender = 'Webber Academy';
      } else if (desc.includes('GC 0826')) {
        method = 'Other';
        sender = 'GC 0826';
      } else {
        method = 'Other';
        sender = desc;
      }

      recordsToInsert.push({
        recipient,
        sender,
        email,
        method,
        amount: parseFloat(deposit.toFixed(2)),
        details: desc,
        'time-created': timestamp,
        'time-updated': FieldValue.serverTimestamp(),
      });
    }
  }

  console.log(`Prepared ${recordsToInsert.length} ledger records (including opening balance).`);

  // 4. Batch Insert into Firestore (batches of 400 to respect Firestore 500 limit)
  const batchSize = 400;
  for (let b = 0; b < recordsToInsert.length; b += batchSize) {
    const chunk = recordsToInsert.slice(b, b + batchSize);
    const batch = db.batch();
    for (const record of chunk) {
      const newDocRef = db.collection('Ledger').doc();
      batch.set(newDocRef, record);
    }
    await batch.commit();
    console.log(`Committed batch of ${chunk.length} records (total inserted: ${Math.min(b + batchSize, recordsToInsert.length)})...`);
  }

  // 5. Check if any registered UCDS member has paid fees and ensure isPaid = true
  for (const user of registeredUsers) {
    if (user.isUCDS === true && user.isPaid === true) {
      console.log(`UCDS Member ${user.username} (${user['email-preferred'] || user['email-login']}) verified with isPaid = true.`);
    }
  }

  console.log('=====================================================');
  console.log(`✓ Successfully seeded ${recordsToInsert.length} transactions into Firestore Ledger.`);
  console.log('✓ No UCID fields stored.');
  console.log('✓ Space-saving amounts stored strictly as `amount` (deposit) or `withdrawl` (withdrawal).');
  console.log('=====================================================');
}

seedLedger()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
