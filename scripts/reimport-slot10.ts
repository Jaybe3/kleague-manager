import { parseTransactionText } from '../lib/importers/text-parser';
import { importTransactions } from '../lib/importers/transaction-importer';
import { db } from '../lib/db';

const transactionData = `12/7/25 12:45 PM ET	Nabers Think I'm Selling Dope	Carl Granderson DL • NO - Dropped	14
11/25/25 7:27 PM ET	Sweet Chin Music	Jordan Love QB • GB - Traded from Nabers Think I'm Selling Dope	13
11/25/25 7:27 PM ET	Nabers Think I'm Selling Dope	Jayden Daniels QB • WAS - Traded from Sweet Chin Music	13
11/23/25 12:14 PM ET	Nabers Think I'm Selling Dope	Hunter Henry TE • NE - Signed for $0.00	12
11/23/25 1:43 AM ET	Nabers Think I'm Selling Dope	Shedeur Sanders QB • CLE - Signed for $0.00 Dillon Gabriel QB • CLE - Dropped	12
11/8/25 1:30 AM ET	Nabers Think I'm Selling Dope	Dillon Gabriel QB • CLE - Signed for $0.00 Cooper Kupp WR • SEA - Dropped	10
11/6/25 1:41 AM ET	Nabers Think I'm Selling Dope	Sam LaPorta TE • DET - Signed for $15.00	10
11/2/25 12:12 PM ET	Nabers Think I'm Selling Dope	Will Reichard K • MIN - Signed for $0.00	9
10/19/25 9:50 AM ET	Nabers Think I'm Selling Dope	Denzel Perryman LB • LAC - Dropped	7
10/19/25 2:01 AM ET	Nabers Think I'm Selling Dope	Nick Folk K • NYJ - Signed for $0.00 Matt Prater K • BUF - Dropped	7
10/16/25 9:26 PM ET	Nabers Think I'm Selling Dope	Ollie Gordon II RB • MIA - Dropped	7
10/16/25 1:37 AM ET	Nabers Think I'm Selling Dope	Germaine Pratt LB • IND - Signed for $37.00	7
10/12/25 1:39 AM ET	Nabers Think I'm Selling Dope	Matt Prater K • BUF - Signed for $0.00 Joey Slye K • TEN - Dropped	6
10/9/25 1:36 AM ET	Nabers Think I'm Selling Dope	Joey Slye K • TEN - Activated	6
10/9/25 1:36 AM ET	Nabers Think I'm Selling Dope	Joey Slye K • TEN - Signed for $0.00 Spencer Shrader K • IND - Dropped	6
10/2/25 1:46 AM ET	Nabers Think I'm Selling Dope	Spencer Shrader K • IND - Activated	5
10/2/25 1:46 AM ET	Nabers Think I'm Selling Dope	Spencer Shrader K • IND - Signed for $3.00 Brandon McManus K • GB - Dropped	5
10/2/25 1:46 AM ET	Nabers Think I'm Selling Dope	Jake Ferguson TE • DAL - Activated	5
10/2/25 1:46 AM ET	Nabers Think I'm Selling Dope	Danielle Hunter DL • HOU - Signed for $15.00 DJ Moore WR • CHI - Dropped	5
10/2/25 1:46 AM ET	Nabers Think I'm Selling Dope	Jake Ferguson TE • DAL - Signed for $15.00 Adam Thielen WR • PIT - Dropped	5
10/2/25 1:46 AM ET	Nabers Think I'm Selling Dope	DeShon Elliott DB • PIT - Signed for $15.00	5
9/25/25 1:41 AM ET	Nabers Think I'm Selling Dope	George Karlaftis DL • KC - Signed for $15.00	4
9/20/25 1:26 AM ET	Nabers Think I'm Selling Dope	Carl Granderson DL • NO - Signed for $0.00	3
9/13/25 1:41 AM ET	Nabers Think I'm Selling Dope	Cam Ward QB • TEN - Signed for $0.00 Russell Wilson QB • NYG - Dropped	2
9/4/25 8:07 PM ET	Nabers Think I'm Selling Dope	Jordan Battle DB • CIN - Dropped	1
9/4/25 1:18 AM ET	Nabers Think I'm Selling Dope	Adam Thielen WR • PIT - Signed for $0.00	1
9/4/25 1:18 AM ET	Nabers Think I'm Selling Dope	Jordan Battle DB • CIN - Signed for $0.00	1`;

async function reimport() {
  console.log('=== Parsing Transactions ===\n');

  const { transactions, errors: parseErrors } = parseTransactionText(transactionData, 2025);

  console.log('Parsed transactions:', transactions.length);
  console.log('Parse errors:', parseErrors.length);
  if (parseErrors.length > 0) {
    console.log('Parse errors:');
    parseErrors.forEach(e => console.log('  -', e));
  }

  // Count by type
  const faCount = transactions.filter(t => t.transactionType === 'FA').length;
  const dropCount = transactions.filter(t => t.transactionType === 'DROP').length;
  console.log(`  FA transactions: ${faCount}`);
  console.log(`  DROP transactions: ${dropCount}`);

  console.log('\n=== Importing Transactions ===\n');

  const result = await importTransactions(transactions);

  console.log('=== 1. Import Results ===');
  console.log('FA signings created:', result.faSigningsCreated);
  console.log('Drops processed:', result.dropsProcessed);
  console.log('Players created:', result.playersCreated);
  console.log('Errors:', result.errors.length);
  console.log('Warnings:', result.warnings.length);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(e => console.log('  -', e));
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach(w => console.log('  -', w));
  }

  // Get updated counts for slot 10
  const team = await db.team.findFirst({
    where: { slotId: 10, seasonYear: 2025 }
  });

  if (!team) {
    console.log('\nTeam not found!');
    return;
  }

  const rosterCount = await db.playerAcquisition.count({
    where: { teamId: team.id, seasonYear: 2025, droppedDate: null }
  });

  const dropsCount = await db.playerAcquisition.count({
    where: { teamId: team.id, seasonYear: 2025, droppedDate: { not: null } }
  });

  console.log('\n=== 2. New Roster Count (droppedDate = null) ===');
  console.log('Current roster:', rosterCount);
  console.log('Expected:', 33);

  console.log('\n=== 3. New Drop Count (droppedDate set) ===');
  console.log('Drops recorded:', dropsCount);
}

reimport();
